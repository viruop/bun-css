import cheerio from "cheerio";
import { TailwindConverter } from "css-to-tailwindcss";

interface ClassDefinitions {
  [className: string]: string[];
}

const converter = new TailwindConverter({
  remInPx: null, // set null if you don't want to convert rem to pixels
  postCSSPlugins: [require("postcss-nested")], // add any postcss plugins to this array
  tailwindConfig: {
    // your tailwind config here
    content: [],
    theme: {
      extend: {
        colors: {
          "custom-color": {
            100: "#123456",
            200: "hsla(210, 100%, 51.0%, 0.016)",
            300: "#654321",
            gold: "hsl(41, 28.3%, 79.8%)",
            marine: "rgb(4, 55, 242, 0.75)",
          },
        },
        screens: {
          "custom-screen": { min: "768px", max: "1024px" },
        },
      },
      supports: {
        grid: "display: grid",
        flex: "display: flex",
      },
    },
  },
});

const inputHtmlFile = Bun.file("index.html");
const inputCSSFile = Bun.file("index.css");

const inputHtml = await inputHtmlFile.text();
const inputCSS = await inputCSSFile.text();
// Load the HTML content using cheerio
const $ = cheerio.load(inputHtml);

// Set to store unique classes
const uniqueClasses = new Set<string>();

// Find all elements with class attribute
$("[class]").each(function () {
  const elementClasses = $(this)?.attr("class")?.split(" ")!;

  // Add each class to the set
  elementClasses.forEach((className: string) => {
    uniqueClasses.add(className);
  });
});

// Convert the set to an array
const classes = Array.from(uniqueClasses);

// Output the classes
console.log("Unique classes:", classes);
const classesToFind = classes;

const filteredCSSContent = filterCSSContent(inputCSS, classesToFind);
console.log(filteredCSSContent);

const cssContent = `${filteredCSSContent}`;
const tailwind = await converter
  .convertCSS(cssContent)
  .then(({ convertedRoot }) => {
    return convertedRoot.toString();
  });

const classDefinitions: ClassDefinitions = {};

const regex = /\.([a-zA-Z0-9-]+)\s*{\s*@apply\s+([^;]+);/g;

// Parse the CSS content to extract class definitions
let match: RegExpExecArray | null;
await Bun.write("output.css", tailwind).then(() =>
  console.log("New CSS file created successfully!")
);
while ((match = regex.exec(tailwind)) !== null) {
  const className = match[1];
  const classProperties = match[2].trim().split(/\s+/);
  classDefinitions[className] = classProperties;
}
// Modify the HTML based on class definitions
$("*").each((_, element) => {
  const classes = $(element).attr("class")?.split(" ");
  const updatedClasses = classes?.map((className) => {
    if (classDefinitions[className]) {
      return classDefinitions[className].join(" ");
    }
    return className;
  });
  $(element).attr("class", updatedClasses?.join(" "));
});

// Write the modified HTML back to a file
const outputFilePath = "output.html";
await Bun.write(outputFilePath, $.html()).then(() =>
  console.log("Output HTML file created:", outputFilePath)
);
function filterCSSContent(inputCSS: string, classesToFind: string[]) {
  let filteredContent = "";

  classesToFind.forEach((classToFind) => {
    const classRegex = new RegExp(`\\.${classToFind}\\s*\\{([^}]+)\\}`, "g");
    const classMatches = inputCSS.match(classRegex);

    if (classMatches) {
      filteredContent += classMatches.join("\n");
    }
  });

  return filteredContent;
}
