/// <reference types="vite/client" />

// Support for ?raw imports
declare module "*.md?raw" {
  const content: string;
  export default content;
}
