import type { Root, Content, Heading } from 'mdast';
import { slugify } from './docs';

type VisitorNode = Root | Content;

type Visitor = (node: VisitorNode) => void;

function visit(node: VisitorNode, callback: Visitor): void {
  callback(node);
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      visit(child as Content, callback);
    }
  }
}

function textFromNode(node: VisitorNode): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  if (!('children' in node) || !Array.isArray(node.children)) return '';
  return node.children.map((child) => textFromNode(child as Content)).join('');
}

export default function remarkHeadingIds() {
  return (tree: Root): void => {
    visit(tree, (node) => {
      if (node.type === 'heading' && (node.depth === 2 || node.depth === 3)) {
        const heading = node as Heading;
        const text = textFromNode(heading).trim();
        heading.data ??= {};
        heading.data.hProperties ??= {};
        heading.data.hProperties.id = slugify(text);
      }
    });
  };
}
