import { relative } from 'node:path';
import assert from 'node:assert';
import { PackageGraph } from './project-graph.js';

export function generateDotLanguage(graph: PackageGraph): string {
  let dot = 'strict digraph {\n';
  dot += `
  rankdir="LR" splines="true" overlap="false" nodesep="0.16" ranksep="0.18" fontname="Helvetica-bold" fontsize="9" style="rounded,bold,filled" fillcolor="#ffffff" compound="true"
  node [shape="box" style="rounded, filled" height="0.2" color="black" fillcolor="#ffffcc" fontcolor="black" fontname="Helvetica" fontsize="9"]
  edge [arrowhead="normal" arrowsize="0.6" penwidth="2.0" color="#00000033" fontname="Helvetica" fontsize="9"]
  `;

  const seenPackages = new Set<string>();

  // Create subgraphs for each package
  for (const packageNode of graph.packages.values()) {
    if (seenPackages.has(packageNode.name)) {
      continue;
    }

    const packageName = replaceAll(packageNode.name.replace(/[@/]/g, ''), '-', '_');

    if (packageNode.files.length === 0) {
      continue;
    }

    seenPackages.add(packageNode.name);

    if (packageNode.external) {
      dot += `  subgraph cluster_${packageName} {\n`;
      dot += `    label="${packageNode.name}";\n`;
      dot += `    labeljust=l;\n`;
      dot += `    href="file://${packageNode.packageRoot}/package.json";\n`;
      dot += `    color="grey"\n`;
      dot += `    style="dashed"\n`;
      dot += `    fontcolor="grey"\n`;
      dot += `    node [style=filled, fillcolor=white, shape=box];\n`;
    } else {
      dot += `  subgraph cluster_${packageName} {\n`;
      dot += `    label="${packageNode.name}";\n`;
      dot += `    href="file://${packageNode.packageRoot}/package.json";\n`;
      dot += `    labeljust=l;\n`;
      dot += `    color=black;\n`;
      dot += `    node [style=filled, fillcolor=white, shape=box];\n`;
    }

    // Add nodes for files in the package
    for (const fileNode of packageNode.files) {
      if (packageNode.external) {
        dot += `    "${fileNode.id}" [label="${relative(
          packageNode.packageRoot,
          fileNode.id
        )}"];\n`;
      } else {
        dot += `    "${fileNode.id}" [label="${relative(
          packageNode.packageRoot,
          fileNode.id
        )}", href="file://${fileNode.id}"];\n`;
      }
    }

    dot += '  }\n';
  }

  // Add edges between files
  for (const packageNode of graph.packages.values()) {
    for (const fileNode of packageNode.files) {
      for (const edgeNode of fileNode.edges) {
        const pkgName = graph.getPackageNameFromFileId(edgeNode.id);

        if (pkgName) {
          const edgePackageNode = graph.packages.get(pkgName);
          assert(edgePackageNode);
          if (edgePackageNode.external) {
            if (!edgePackageNode.hasTypes(edgeNode.id)) {
              dot += `  "${fileNode.id}" -> "${edgeNode.id}" ${
                edgePackageNode.missing
                  ? '[xlabel="missing from package.json" tooltip="missing from package.json" fontcolor="orange" color="orange"]'
                  : '[xlabel="missing types" tooltip="missing types" fontcolor="red" color="red"]'
              };\n`;
            } else if (packageNode.isDependencyMissing(edgePackageNode.name)) {
              dot += `  "${fileNode.id}" -> "${edgeNode.id}" [xlabel="missing from package.json" tooltip="missing from package.json" fontcolor="orange" color="orange"];\n`;
            } else {
              dot += `  "${fileNode.id}" -> "${edgeNode.id}" [color="grey" style="dashed"];\n`;
            }
          } else if (
            packageNode.isDependencyMissing(edgePackageNode.name) &&
            edgePackageNode.name !== packageNode.name
          ) {
            dot += `  "${fileNode.id}" -> "${edgeNode.id}" [xlabel="missing from package.json" tooltip="missing from package.json" fontcolor="orange" color="orange"];\n`;
          } else {
            dot += `  "${fileNode.id}" -> "${edgeNode.id}" ${
              edgePackageNode && !edgePackageNode.hasTypes(edgeNode.id)
                ? '[xlabel="missing types" tooltip="missing types" fontcolor="red" color="red"]'
                : ''
            };\n`;
          }
        }
      }
    }
  }

  dot += '}';
  return dot;
}

function replaceAll(str: string, oldStr: string, newStr: string): string {
  return str.replace(new RegExp(oldStr, 'g'), newStr);
}
