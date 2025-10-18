import { Parser } from 'json2csv';

export function createCSV(jsonData) {
  const fields = Array.from(new Set(jsonData.flatMap(obj => Object.keys(obj))));
  const parser = new Parser({ fields });
  return parser.parse(jsonData);
}
