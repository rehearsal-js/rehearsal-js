import { relative } from 'node:path';
import { PackageGraph } from './project-graph.js';

export function generateDotLanguage(graph: PackageGraph): string {
  let dot = 'strict digraph {\n';
  dot += `
  rankdir="LR" splines="true" overlap="false" nodesep="0.16" ranksep="0.18" fontname="Helvetica-bold" fontsize="9" style="rounded,bold,filled" fillcolor="#ffffff" compound="true"
  node [shape="box" style="rounded, filled" height="0.2" color="black" fillcolor="#ffffcc" fontcolor="black" fontname="Helvetica" fontsize="9"]
  edge [arrowhead="normal" arrowsize="0.6" penwidth="2.0" color="#00000033" fontname="Helvetica" fontsize="9"]
  `;

  // Create subgraphs for each package
  for (const packageNode of graph.packages.values()) {
    const packageName = replaceAll(packageNode.name.replace(/[@/]/g, ''), '-', '_');
    dot += `  subgraph cluster_${packageName} {\n`;
    dot += `    label="${packageNode.name}";\n`;
    dot += `    labeljust=l;\n`;
    dot += `    color=black;\n`;
    dot += `    node [style=filled, fillcolor=white, shape=box];\n`;

    // Add nodes for files in the package
    for (const fileNode of packageNode.files) {
      dot += `    "${fileNode.id}" [label="${relative(
        packageNode.packageRoot,
        fileNode.id
      )}", href="file://${fileNode.id}"];\n`;
    }

    dot += '  }\n';
  }

  // Add edges between files
  for (const packageNode of graph.packages.values()) {
    for (const fileNode of packageNode.files) {
      for (const edgeNode of fileNode.edges) {
        dot += `  "${fileNode.id}" -> "${edgeNode.id}";\n`;
      }
    }
  }

  dot += '}';
  return dot;
}

function replaceAll(str: string, oldStr: string, newStr: string): string {
  return str.replace(new RegExp(oldStr, 'g'), newStr);
}
