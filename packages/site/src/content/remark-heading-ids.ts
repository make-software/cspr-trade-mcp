import { slugify } from './docs';

function visit(node, callback) {
  if (!node || typeof node !== 'object') return;
  callback(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) visit(child, callback);
  }
}

function textFromNode(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value || '';
  if (!Array.isArray(node.children)) return '';
  return node.children.map(textFromNode).join('');
}

export default function remarkHeadingIds() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type === 'heading' && (node.depth === 2 || node.depth === 3)) {
        const text = textFromNode(node).trim();
        node.data ??= {};
        node.data.hProperties ??= {};
        node.data.hProperties.id = slugify(text);
      }
    });
  };
}
