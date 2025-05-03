import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONFIG = {
  srcDir: path.join(__dirname, "src"),
  outputDir: path.join(__dirname, "dist"),
  markdownDir: path.join(__dirname, "src", "markdown"),
  templatesDir: path.join(__dirname, "src", "templates"),
  imagesDir: path.join(__dirname, "src", "images"),
  cssDir: path.join(__dirname, "src", "css"),
  defaultTemplate: "recipe-template.html",
  indexTemplate: "index-template.html",
}

const i18n = {
  lang: "en",
  siteTitle: "Recipe Collection",
  backLink: "Back to recipes",
  cookingTimeTitle: "Cooking time",
  servingFor: "for",
  servingPersons: "people",
}

function build() {
  console.log("Building recipe site...")

  try {
    console.log("Completely removing output directory...")
    removeDirectory(CONFIG.outputDir)
  } catch (error) {
    console.error(`Error removing directory: ${error.message}`)
    console.log("Will try to continue with build...")
  }

  ensureDirectoryExists(CONFIG.outputDir)
  ensureDirectoryExists(path.join(CONFIG.outputDir, "css"))
  ensureDirectoryExists(path.join(CONFIG.outputDir, "images"))

  copyDirectory(CONFIG.cssDir, path.join(CONFIG.outputDir, "css"))
  copyDirectory(CONFIG.imagesDir, path.join(CONFIG.outputDir, "images"))

  const markdownFiles = getFilesInDirectory(CONFIG.markdownDir, ".md")
  console.log(`Found ${markdownFiles.length} recipe files`)

  const recipes = markdownFiles.map((filePath) => {
    const content = fs.readFileSync(filePath, "utf-8")
    const recipe = parseRecipeMarkdown(content)
    recipe.slug = path.basename(filePath, ".md")
    return recipe
  })

  recipes.forEach((recipe) => {
    const html = generateRecipeHTML(recipe)
    fs.writeFileSync(path.join(CONFIG.outputDir, `${recipe.slug}.html`), html)
    console.log(`Generated: ${recipe.slug}.html`)
  })

  const indexHTML = generateIndexHTML(recipes)
  fs.writeFileSync(path.join(CONFIG.outputDir, "index.html"), indexHTML)
  console.log("Generated: index.html")

  console.log("Build completed successfully!")
}

function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file)
      if (fs.lstatSync(curPath).isDirectory()) {
        removeDirectory(curPath)
      } else {
        try {
          fs.unlinkSync(curPath)
        } catch (err) {
          console.error(`Failed to delete ${curPath}: ${err.message}`)
        }
      }
    })

    try {
      fs.rmdirSync(dirPath)
    } catch (err) {
      console.error(`Failed to remove directory ${dirPath}: ${err.message}`)
    }
  }
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function copyDirectory(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return

  ensureDirectoryExists(destDir)

  const files = fs.readdirSync(srcDir)

  for (const file of files) {
    const srcPath = path.join(srcDir, file)
    const destPath = path.join(destDir, file)

    const stat = fs.statSync(srcPath)

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function getFilesInDirectory(dirPath, extension) {
  if (!fs.existsSync(dirPath)) return []

  const files = fs.readdirSync(dirPath)
  const result = []

  for (const file of files) {
    const filePath = path.join(dirPath, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      result.push(...getFilesInDirectory(filePath, extension))
    } else if (path.extname(file) === extension) {
      result.push(filePath)
    }
  }

  return result
}

function parseRecipeMarkdown(content) {
  // Extract front matter
  const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/
  const match = content.match(frontMatterRegex)

  let frontMatter = {}
  let mainContent = content

  if (match) {
    const frontMatterText = match[1]
    frontMatter = parseFrontMatter(frontMatterText)
    mainContent = content.slice(match[0].length)
  }

  // Split content into Recipe and Ingredients sections based on the # headers
  const majorSections = extractMajorSections(mainContent)

  // Process each major section to get subsections
  const recipeSections = majorSections.recipe
    ? processMarkdownSections(majorSections.recipe)
    : {}
  const ingredientSections = majorSections.ingredients
    ? processMarkdownSections(majorSections.ingredients)
    : {}

  // Create recipe object
  const recipe = {
    title: frontMatter.title || "Untitled Recipe",
    image: frontMatter.image || "default.jpg",
    servings: frontMatter.servings || 4,
    cookingTime: frontMatter.cookingTime || "",
    category: frontMatter.category || "Non catégorisé",
    recipeMainImages: majorSections.mainImages.recipe || [],
    ingredientsMainImages: majorSections.mainImages.ingredients || [],
    recipeIntroText: majorSections.introText.recipe || "",
    ingredientsIntroText: majorSections.introText.ingredients || "",
    steps: processSteps(recipeSections),
    ingredients: processIngredients(ingredientSections),
  }

  return recipe
}

function extractMajorSections(content) {
  const result = {
    recipe: "",
    ingredients: "",
    mainImages: {
      recipe: [],
      ingredients: [],
    },
    introText: {
      recipe: "",
      ingredients: "",
    },
  }

  // Look for # Recipe and # Ingredients headers
  const recipeMatch = content.match(
    /# Recipe\s*\n([\s\S]*?)(?=# Ingredients|$)/i,
  )
  const ingredientsMatch = content.match(/# Ingredients\s*\n([\s\S]*?)(?=$)/i)

  if (recipeMatch && recipeMatch[1]) {
    const recipeContent = recipeMatch[1].trim()

    // Extract images and intro text directly under the # Recipe section (before any ## subsections)
    const subsectionStart = recipeContent.indexOf("##")

    // If there are subsections, only check content before them
    const textToCheck =
      subsectionStart > -1
        ? recipeContent.substring(0, subsectionStart)
        : recipeContent

    // Extract images
    const imageRegex = /!\[(.*?)\]\((.*?)\)/g
    let imageMatch
    let processedText = textToCheck

    while ((imageMatch = imageRegex.exec(textToCheck)) !== null) {
      result.mainImages.recipe.push({
        alt: imageMatch[1] || "",
        src: imageMatch[2] || "",
      })

      // Remove the image markdown from the text we'll process for intro
      processedText = processedText.replace(imageMatch[0], "")
    }

    // Get remaining text as intro text (after removing images)
    const introText = processedText.trim()
    if (introText) {
      result.introText.recipe = introText
    }

    // Store the full content
    result.recipe = recipeContent
  }

  if (ingredientsMatch && ingredientsMatch[1]) {
    const ingredientsContent = ingredientsMatch[1].trim()

    // Extract images and intro text directly under the # Ingredients section (before any ## subsections)
    const subsectionStart = ingredientsContent.indexOf("##")

    // If there are subsections, only check content before them
    const textToCheck =
      subsectionStart > -1
        ? ingredientsContent.substring(0, subsectionStart)
        : ingredientsContent

    // Extract images
    const imageRegex = /!\[(.*?)\]\((.*?)\)/g
    let imageMatch
    let processedText = textToCheck

    while ((imageMatch = imageRegex.exec(textToCheck)) !== null) {
      result.mainImages.ingredients.push({
        alt: imageMatch[1] || "",
        src: imageMatch[2] || "",
      })

      // Remove the image markdown from the text we'll process for intro
      processedText = processedText.replace(imageMatch[0], "")
    }

    // Get remaining text as intro text (after removing images)
    const introText = processedText.trim()
    if (introText) {
      result.introText.ingredients = introText
    }

    // Store the full content
    result.ingredients = ingredientsContent
  }

  return result
}

function parseFrontMatter(text) {
  const result = {}
  const lines = text.split("\n")

  for (const line of lines) {
    const colonIndex = line.indexOf(":")
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()
      result[key] = value.replace(/^["'](.*)["']$/, "$1")
    }
  }

  return result
}

function processMarkdownSections(content) {
  const sections = {}
  const sectionRegex = /##\s+(.*)\n([\s\S]*?)(?=##\s+|$)/g

  let match
  while ((match = sectionRegex.exec(content)) !== null) {
    const title = match[1].trim()
    const sectionContent = match[2].trim()
    sections[title] = sectionContent
  }

  return sections
}

function processIngredients(sections) {
  const result = []

  for (const [title, content] of Object.entries(sections)) {
    result.push({
      title,
      items: parseListItems(content),
    })
  }

  return result
}

function processSteps(sections) {
  const result = []

  for (const [title, content] of Object.entries(sections)) {
    result.push({
      title,
      items: parseListItems(content),
    })
  }

  return result
}

function parseListItems(content) {
  const lines = content.split("\n")
  const items = []

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith("-") || trimmedLine.startsWith("*")) {
      items.push(trimmedLine.substring(1).trim())
    } else if (trimmedLine.startsWith("![")) {
      // This is an image, add it as a special item
      const imageMatch = trimmedLine.match(/!\[(.*?)\]\((.*?)\)/)
      if (imageMatch) {
        const altText = imageMatch[1] || ""
        const imagePath = imageMatch[2] || ""
        items.push({
          type: "image",
          alt: altText,
          src: imagePath,
        })
      }
    }
  }

  return items
}

function generateRecipeHTML(recipe) {
  const templatePath = path.join(CONFIG.templatesDir, CONFIG.defaultTemplate)
  let template = fs.readFileSync(templatePath, "utf-8")

  template = template.replace(/{{title}}/g, recipe.title)
  template = template.replace(/{{image}}/g, recipe.image)
  template = template.replace(/{{servings}}/g, recipe.servings)
  template = template.replace(/{{cookingTime}}/g, recipe.cookingTime)

  // Generate intro HTML
  let introHTML = ""

  // Add main images at the top of the recipe section
  if (recipe.recipeMainImages && recipe.recipeMainImages.length > 0) {
    introHTML += '<div class="main-section-images">'
    recipe.recipeMainImages.forEach((image) => {
      const imagePath = `images/${image.src}`
      introHTML += `<div class="main-image"><img src="${imagePath}" alt="${image.alt}" class="recipe-main-image"></div>`
    })
    introHTML += "</div>"
  }

  // Add intro text if it exists
  if (recipe.recipeIntroText) {
    introHTML += `<div class="section-intro">${recipe.recipeIntroText}</div>`
  }

  template = template.replace(/{{introduction}}/g, introHTML)

  // Generate steps HTML
  let stepsHTML = ""

  // Add regular subsections
  let stepIndex = 1
  recipe.steps.forEach((section) => {
    stepsHTML += `<div class="step-section">`
    stepsHTML += `<h3>${section.title}</h3>`
    stepsHTML += `<div class="steps">`
    section.items.forEach((item) => {
      if (typeof item === "string") {
        stepsHTML += `<p class="step"><span class="step-number">${stepIndex}</span>${item}</p>` //•
        stepIndex++
      } else if (item.type === "image") {
        // Handle image paths
        const imagePath = `images/${item.src}`
        stepsHTML += `<div class="step-image"><img src="${imagePath}" alt="${item.alt}" class="recipe-inline-image"></div>`
      }
    })
    stepsHTML += `</div></div>`
  })

  template = template.replace(/{{steps}}/g, stepsHTML)

  // Generate ingredients HTML
  let ingredientsHTML = ""

  // Add main images at the top of the ingredients section
  if (recipe.ingredientsMainImages && recipe.ingredientsMainImages.length > 0) {
    ingredientsHTML += '<div class="main-section-images">'
    recipe.ingredientsMainImages.forEach((image) => {
      const imagePath = `images/${image.src}`
      ingredientsHTML += `<div class="main-image"><img src="${imagePath}" alt="${image.alt}" class="recipe-main-image"></div>`
    })
    ingredientsHTML += "</div>"
  }

  // Add intro text if it exists
  if (recipe.ingredientsIntroText) {
    ingredientsHTML += `<div class="section-intro">${recipe.ingredientsIntroText}</div>`
  }

  // Add regular subsections
  recipe.ingredients.forEach((section) => {
    ingredientsHTML += `<div class="ingredient-section">`
    ingredientsHTML += `<h3>${section.title}</h3>`
    ingredientsHTML += `<ul class="ingredients">`
    section.items.forEach((item) => {
      if (typeof item === "string") {
        ingredientsHTML += `<li>${item}</li>`
      } else if (item.type === "image") {
        // Handle image paths
        const imagePath = `images/${item.src}`
        ingredientsHTML += `<li class="image-item"><img src="${imagePath}" alt="${item.alt}" class="recipe-inline-image"></li>`
      }
    })
    ingredientsHTML += `</ul></div>`
  })

  template = template.replace(/{{ingredients}}/g, ingredientsHTML)

  return template
    .replace(/{{lang}}/g, i18n.lang)
    .replace(/{{backLink}}/g, i18n.backLink)
    .replace(/{{cookingTimeTitle}}/g, i18n.cookingTimeTitle)
    .replace(/{{servingFor}}/g, i18n.servingFor)
    .replace(/{{servingPersons}}/g, i18n.servingPersons)
}

function generateIndexHTML(recipes) {
  const templatePath = path.join(CONFIG.templatesDir, CONFIG.indexTemplate)
  let template = fs.readFileSync(templatePath, "utf-8")

  // Group recipes by category
  const recipesByCategory = {}

  recipes.forEach((recipe) => {
    const category = recipe.category
    if (!recipesByCategory[category]) {
      recipesByCategory[category] = []
    }
    recipesByCategory[category].push(recipe)
  })

  // Generate HTML for each category
  let categoriesHTML = ""

  // Get categories in alphabetical order
  const sortedCategories = Object.keys(recipesByCategory).sort()

  sortedCategories.forEach((category) => {
    const categoryRecipes = recipesByCategory[category]

    categoriesHTML += `
      <div class="category-section">
        <h2 class="category-title">${category}</h2>
        <div class="recipe-grid">
    `

    categoryRecipes.forEach((recipe) => {
      categoriesHTML += `
        <a href="${recipe.slug}.html" class="recipe-card">
          <div class="recipe-card-image">
            <img src="images/${recipe.image}" alt="${recipe.title}">
          </div>
          <h3 class="recipe-card-title">${recipe.title}</h3>
        </a>
      `
    })

    categoriesHTML += `
        </div>
      </div>
    `
  })

  template = template.replace(/{{recipes}}/g, categoriesHTML)
  return template
    .replace(/{{lang}}/g, i18n.lang)
    .replace(/{{siteTitle}}/g, i18n.siteTitle)
}

build()

export default build
