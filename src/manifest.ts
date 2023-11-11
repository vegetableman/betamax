import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "../package.json";

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch, label = "0"] = packageJson.version
  // can only contain digits, dots, or dash
  .replace(/[^\d.-]+/g, "")
  // split into version parts
  .split(/[.-]/);

const manifest = defineManifest(async () => ({
  manifest_version: 3,
  name: packageJson.displayName ?? packageJson.name,
  version: `${major}.${minor}.${patch}`,
  description: packageJson.description,
  background: { service_worker: "src/pages/background/index.ts"},
  action: {
    default_icon: "icons/34x34.png"
  },
  icons: {
    "16": "icons/16x16.png",
    "48": "icons/48x48.png",
    "128": "icons/128x128.png"
  },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*", "<all_urls>"],
      css: ["src/pages/content/content.css"],
      js: ["src/pages/content/index.tsx"],
    },
  ],
  web_accessible_resources: [
    {
      resources: ["src/assets/fonts/**", "src/assets/img/**", "src/pyodide.worker.js", 'src/pyodide/**'],
      matches: ["*://*/*"],
    },
  ],
  content_security_policy: {
    sandbox: "sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline' 'unsafe-eval'; child-src 'self' blob:;"
  },
  sandbox: {
    pages: [
      "src/sandbox.html"
    ]
  },
  permissions: [
    "activeTab",
    "webRequest",
    "tabs",
    "storage",
    "scripting",
    "offscreen"
  ],
  host_permissions: [
    "http://*/*",
    "https://*/*"
  ],
  commands: {
    "toggle_capture": {
      "suggested_key": {
        "default": "Alt+Shift+R",
        "mac": "Alt+Shift+R"
      },
      "description": "Toggle capture"
    },
    "cancel_capture": {
      "suggested_key": {
        "default": "Alt+Shift+C",
        "mac": "Alt+Shift+C"
      },
      "description": "Cancel capture"
    }
  }
}));

export default manifest;
