# StaticStew - A Recipe Static Site Generator

StaticStew is a simple static site generator for converting markdown recipe files into a beautiful recipe website.

![StaticStew screenshot](../assets/staticstew-screenshot.webp?raw=true)

## Features

- No external dependencies - uses only Node.js built-in modules
- Displays recipes in a responsive grid layout
- Orders recipes by category
- Lightweight and fast

## Project Structure

```
recipe-site/
├── src/
│   ├── markdown/     # Recipe markdown files
│   │   └── coq-au-vin.md
│   ├── templates/    # HTML templates
│   │   ├── recipe-template.html
│   │   └── index-template.html
│   ├── images/       # Recipe images
│   │   └── coq-au-vin.jpg
│   └── css/          # Styling
│       └── style.css
├── dist/             # Output directory (generated)
├── build.mjs         # Build script
└── README.md
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/username/recipe-site.git
   cd recipe-site
   ```

2. Run the build script:
   ```bash
   node build.mjs
   ```

   If you want to completely clean the output directory before building:
   ```bash
   node build.mjs clean
   ```

3. The generated site will be in the `dist/` directory. You can open `dist/index.html` in a browser to view it.

### Troubleshooting Permission Issues

If you encounter permission errors like:
```
Error: EACCES: permission denied, copyfile '...'
```

Try one of these solutions:

1. Run the build with the clean flag:
   ```bash
   node build.mjs clean
   ```

2. Manually remove the dist directory:
   ```bash
   rm -rf dist
   node build.mjs
   ```

3. Fix permissions on the dist directory:
   ```bash
   chmod -R 755 dist
   node build.mjs
   ```

## Recipe Markdown Format

Each recipe should be in a markdown file with the following format:

```markdown
---
title: Recipe Title
image: image-filename.webp
servings: 4
cookingTime: 30 minutes
category: Plat
---

# Recipe

![Main recipe image](image-filename.webp)

Introduction text for the recipe. This can be a paragraph describing the dish, its history, or any other information you want to provide before the step-by-step instructions.

## Section Name (Instructions)
- Step 1
- Step 2
- Step 3
![Step image description](image-filename.webp)

## Another Section
- Another step 1
- Another step 2

# Ingredients

![Main ingredients image](another-image.webp)

Introduction text for the ingredients section. This can describe the key ingredients, possible substitutions, or notes about sourcing.

## Ingrédients
- Ingredient 1
- Ingredient 2
- Ingredient 3
![Ingredients image](another-image.webp)

## Garniture
- Garnish 1
- Garnish 2
```

Notes:
- The markdown file must have front matter at the top with at least `title` and `image`.
- The `category` field is optional but recommended for organizing recipes on the index page (e.g., "Entrée", "Plat", "Dessert", "Entremet", etc.).
- The content is divided into two main sections: "# Recipe" and "# Ingredients".
- You can include images directly under the main section headers (before any subsections), which will be displayed at the top of that section.
- You can include introduction text after the main image and before the first subsection header.
- Under each main section, use "##" headers to create subsections.
- All lists must use the dash (`-`) format.
- You can include images within any subsection using the standard markdown image syntax: `![Alt text](image-filename.webp)`.
- All image files should be placed in the `src/images` directory. The build script will automatically copy them to the correct location and adjust paths.

## Adding New Recipes

To add a new recipe:

1. Create a new markdown file in the `src/markdown/` directory
2. Add any recipe images to the `src/images/` directory
3. Follow the recipe markdown format described above
4. Run the build script to generate the updated site

## Customization

### Templates and Styling
You can customize the templates in `src/templates/` and the styling in `src/css/style.css` to change the appearance of the generated site.

### Internationalization
The site supports internationalization through a configuration object in the build script. You can modify the following variables to change the language and text elements:

```javascript
const i18n = {
  lang: "en",                       // Language code for the HTML lang attribute
  siteTitle: "Recipe Collection",   // Title of the site
  backLink: "Back to recipes",      // Text for the back to index link
  cookingTimeTitle: "Cooking time", // Text for cooking time label
  servingFor: "for",                // Text before number of servings
  servingPersons: "people"          // Text after number of servings
}
```

To change the site to French, for example, you could use:
```javascript
const i18n = {
  lang: "fr", 
  siteTitle: "Recettes de Cuisine", 
  backLink: "Retour aux recettes", 
  cookingTimeTitle: "Temps de cuisson", 
  servingFor: "pour", 
  servingPersons: "personnes" 
}
```


## Example

An example recipe for "Coq au Vin" is included to demonstrate the formatting.

## Dependencies

This project has no external dependencies and uses only Node.js built-in modules.