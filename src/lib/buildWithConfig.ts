import fs from "fs";
import path from "path";
import { Config } from "../types";
import { buildSingle } from "./buildSingleWithConfig";

export function build(config: Config) {
  const { inputFolder, outputFolder, templateSuffix, locales } = config;

  const inputFolderPath = path.join(inputFolder);
  const outputFolderPath = path.join(outputFolder);

  // create folder if not exist
  if (!fs.existsSync(outputFolderPath)) {
    fs.mkdirSync(outputFolderPath, { recursive: true });
  }

  let list: string[];
  try {
    const files = fs.readdirSync(inputFolderPath, { withFileTypes: true });
    list = files.filter((f) => f.isDirectory()).map((f) => f.name);
  } catch (e) {
    console.error(e);
    list = [];
  }

  list.forEach((emailName) => {
    buildSingle(config, emailName);
  });
}
