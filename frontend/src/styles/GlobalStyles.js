import { createGlobalStyle } from 'styled-components'

const GlobalStyles = createGlobalStyle`
  /* Reset & box-sizing */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  /* Root & base */
  :root {
    font-family: 'Montserrat', system-ui, -apple-system, 'Segoe UI', Avenir, Helvetica, Arial, sans-serif;
    line-height: 1.5;
    font-weight: 400;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    color-scheme: light;
    color: #111;
  }

  /* Body & root (layout full height) */
  html, body {
    margin: 0;
    min-width: 320px;
    height: 100%;
    overflow: hidden;
  }

  #root {
    height: 100%;
    overflow: hidden;
  }

  /* Links (fallback – páginas podem sobrescrever) */
  a {
    font-weight: 500;
    color: #111;
    text-decoration: underline;
  }

  a:hover {
    color: #374151;
  }

  /* Headings (fallback) */
  h1, h2, h3, h4, h5, h6 {
    margin: 0 0 0.5em;
    font-size: 3.2em;
    line-height: 1.1;
    font-weight: 700;
  }

  /* Buttons (fallback – páginas usam classes próprias) */
  button {
    font-family: inherit;
    font-size: 1em;
    cursor: pointer;
  }

  button:focus-visible {
    outline: 2px solid #111;
    outline-offset: 2px;
  }

  /* Inputs (fallback) */
  input {
    font-family: inherit;
    font-size: 1em;
  }
`

export default GlobalStyles
