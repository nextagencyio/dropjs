'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronUp, ChevronDown, ChevronLeft } from 'lucide-react';
import { reorderTerms, deleteTerm } from '@/app/(admin)/_actions/system';
import { useToast } from '@/components/toast';

export interface TermTreeNode {
  tid: number;
  title: string;
  weight: number;
  parent: number;
  status: number;
  children: TermTreeNode[];
}

interface FlatNode {
  tid: number;
  title: string;
  weight: number;
  parent: number;
  status: number;
  depth: number;
  hasChildren: boolean;
  isLastChild: boolean;
  ancestorIsLast: boolean[];
  children: TermTreeNode[];
}

function flattenTree(
  nodes: TermTreeNode[],
  depth: number = 0,
  ancestorIsLast: boolean[] = [],
): FlatNode[] {
  const result: FlatNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    result.push({
      tid: node.tid,
      title: node.title,
      weight: node.weight,
      parent: node.parent,
      status: node.status,
      depth,
      hasChildren: node.children.length > 0,
      isLastChild: isLast,
      ancestorIsLast: [...ancestorIsLast],
      children: node.children,
    });
    result.push(
      ...flattenTree(node.children, depth + 1, [...ancestorIsLast, isLast]),
    );
  }
  return result;
}

function findSiblings(tree: TermTreeNode[], tid: number): TermTreeNode[] | null {
  for (const node of tree) {
    if (node.children.some((c) => c.tid === tid)) {
      return node.children;
    }
    const found = findSiblings(node.children, tid);
    if (found) return found;
  }
  return null;
}

function findNodeInTree(tree: TermTreeNode[], tid: number): TermTreeNode | null {
  for (const node of tree) {
    if (node.tid === tid) return node;
    const found = findNodeInTree(node.children, tid);
    if (found) return found;
  }
  return null;
}

function findParentInTree(tree: TermTreeNode[], tid: number): TermTreeNode | null {
  for (const node of tree) {
    if (node.children.some((c) => c.tid === tid)) return node;
    const found = findParentInTree(node.children, tid);
    if (found) return found;
  }
  return null;
}

function canMoveUp(node: FlatNode, tree: TermTreeNode[]): boolean {
  const siblings = node.depth === 0
    ? tree
    : findSiblings(tree, node.tid) ?? [];
  const idx = siblings.findIndex((n) => n.tid === node.tid);
  return idx > 0;
}

function canMoveDown(node: FlatNode, tree: TermTreeNode[]): boolean {
  const siblings = node.depth === 0
    ? tree
    : findSiblings(tree, node.tid) ?? [];
  const idx = siblings.findIndex((n) => n.tid === node.tid);
  return idx >= 0 && idx < siblings.length - 1;
}

function canIndent(node: FlatNode, tree: TermTreeNode[]): boolean {
  const siblings = node.depth === 0
    ? tree
    : findSiblings(tree, node.tid) ?? [];
  const idx = siblings.findIndex((n) => n.tid === node.tid);
  return idx > 0;
}

export function TermTreeClient({
  vocabulary,
  vocabLabel,
  initialTree,
  initialContentCounts,
}: {
  vocabulary: string;
  vocabLabel: string;
  initialTree: TermTreeNode[];
  initialContentCounts: Record<number, number>;
}) {
  const { error: showError } = useToast();
  const [tree, setTree] = useState<TermTreeNode[]>(initialTree);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const contentCounts = initialContentCounts;
  const [saving, setSaving] = useState(false);

  const handleDelete = async (tid: number, title: string) => {
    if (!confirm(`Delete term "${title}"?`)) return;
    const result = await deleteTerm(vocabulary, tid);
    if (result.success) {
      // Remove from local tree
      function removeFromTree(nodes: TermTreeNode[]): TermTreeNode[] {
        return nodes
          .filter((n) => n.tid !== tid)
          .map((n) => ({ ...n, children: removeFromTree(n.children) }));
      }
      setTree(removeFromTree(tree));
    } else {
      showError(result.error ?? 'Failed to delete term');
    }
  };

  const toggleCollapse = (tid: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(tid)) {
        next.delete(tid);
      } else {
        next.add(tid);
      }
      return next;
    });
  };

  function collectUpdates(nodes: TermTreeNode[], parentId: number): Array<{ tid: number; parent: number; weight: number }> {
    const updates: Array<{ tid: number; parent: number; weight: number }> = [];
    for (let i = 0; i < nodes.length; i++) {
      updates.push({ tid: nodes[i].tid, parent: parentId, weight: i });
      updates.push(...collectUpdates(nodes[i].children, nodes[i].tid));
    }
    return updates;
  }

  async function saveOrder(newTree: TermTreeNode[]) {
    setSaving(true);
    const updates = collectUpdates(newTree, 0);
    const result = await reorderTerms(vocabulary, updates);
    if (result.success) {
      setTree(newTree);
    } else {
      showError(result.error ?? 'Failed to save order');
    }
    setSaving(false);
  }

  function cloneTree(nodes: TermTreeNode[]): TermTreeNode[] {
    return nodes.map((n) => ({ ...n, children: cloneTree(n.children) }));
  }

  const moveUp = (tid: number) => {
    const newTree = cloneTree(tree);
    const siblings =
      findSiblings(newTree, tid) ??
      (newTree.some((n) => n.tid === tid) ? newTree : null);
    if (!siblings) return;
    const idx = siblings.findIndex((n) => n.tid === tid);
    if (idx <= 0) return;
    [siblings[idx - 1], siblings[idx]] = [siblings[idx], siblings[idx - 1]];
    saveOrder(newTree);
  };

  const moveDown = (tid: number) => {
    const newTree = cloneTree(tree);
    const siblings =
      findSiblings(newTree, tid) ??
      (newTree.some((n) => n.tid === tid) ? newTree : null);
    if (!siblings) return;
    const idx = siblings.findIndex((n) => n.tid === tid);
    if (idx < 0 || idx >= siblings.length - 1) return;
    [siblings[idx], siblings[idx + 1]] = [siblings[idx + 1], siblings[idx]];
    saveOrder(newTree);
  };

  const indent = (tid: number) => {
    const newTree = cloneTree(tree);
    const siblings =
      findSiblings(newTree, tid) ??
      (newTree.some((n) => n.tid === tid) ? newTree : null);
    if (!siblings) return;
    const idx = siblings.findIndex((n) => n.tid === tid);
    if (idx <= 0) return;
    const node = siblings.splice(idx, 1)[0];
    const prevSibling = siblings[idx - 1];
    node.parent = prevSibling.tid;
    prevSibling.children.push(node);
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(prevSibling.tid);
      return next;
    });
    saveOrder(newTree);
  };

  const outdent = (tid: number) => {
    const newTree = cloneTree(tree);
    const parentNode = findParentInTree(newTree, tid);
    if (!parentNode) return;
    const idx = parentNode.children.findIndex((n) => n.tid === tid);
    if (idx < 0) return;
    const node = parentNode.children.splice(idx, 1)[0];
    const grandParent = findParentInTree(newTree, parentNode.tid);
    const grandParentTid = grandParent ? grandParent.tid : 0;
    node.parent = grandParentTid;
    if (grandParent) {
      const parentIdx = grandParent.children.findIndex((n) => n.tid === parentNode.tid);
      grandParent.children.splice(parentIdx + 1, 0, node);
    } else {
      const rootIdx = newTree.findIndex((n) => n.tid === parentNode.tid);
      newTree.splice(rootIdx + 1, 0, node);
    }
    saveOrder(newTree);
  };

  // Build visible flat list (respecting collapsed nodes)
  const flatNodes = flattenTree(tree);
  const visibleNodes: FlatNode[] = [];

  for (const node of flatNodes) {
    let hidden = false;
    if (node.depth > 0) {
      let parentTid = node.parent;
      while (parentTid > 0) {
        if (collapsed.has(parentTid)) {
          hidden = true;
          break;
        }
        const pNode = findNodeInTree(tree, parentTid);
        parentTid = pNode?.parent ?? 0;
      }
    }
    if (!hidden) {
      visibleNodes.push(node);
    }
  }

  return (
    <>
      {saving && (
        <div className="mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 text-gin-warning rounded-gin-s text-sm">
          Saving order...
        </div>
      )}

      {visibleNodes.length === 0 ? (
        <div className="text-center py-12 text-gin-text-light">
          No terms found.{' '}
          <Link href={`/structure/taxonomy/${vocabulary}/add`} className="text-gin-primary hover:underline">Create your first term</Link>.
        </div>
      ) : (
        <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px_60px_200px] gap-2 px-4 py-3 bg-gin-bg-layer2 border-b border-gin-border-table text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
            <div>Name</div>
            <div className="text-center">Content</div>
            <div className="text-center">Weight</div>
            <div className="text-center">Status</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Rows */}
          {visibleNodes.map((node) => (
            <TermRow
              key={node.tid}
              node={node}
              vocabulary={vocabulary}
              isCollapsed={collapsed.has(node.tid)}
              contentCount={contentCounts[node.tid] ?? 0}
              onToggle={() => toggleCollapse(node.tid)}
              onDelete={() => handleDelete(node.tid, node.title)}
              onMoveUp={() => moveUp(node.tid)}
              onMoveDown={() => moveDown(node.tid)}
              onIndent={() => indent(node.tid)}
              onOutdent={() => outdent(node.tid)}
              canMoveUpProp={canMoveUp(node, tree)}
              canMoveDownProp={canMoveDown(node, tree)}
              canIndentProp={canIndent(node, tree)}
              canOutdent={node.depth > 0}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface TermRowProps {
  node: FlatNode;
  vocabulary: string;
  isCollapsed: boolean;
  contentCount: number;
  onToggle: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  canMoveUpProp: boolean;
  canMoveDownProp: boolean;
  canIndentProp: boolean;
  canOutdent: boolean;
}

function TermRow({
  node,
  vocabulary,
  isCollapsed,
  contentCount,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
  canMoveUpProp,
  canMoveDownProp,
  canIndentProp,
  canOutdent,
}: TermRowProps) {
  return (
    <div className="grid grid-cols-[1fr_80px_80px_60px_200px] gap-2 px-4 py-2 border-b border-gin-border-table items-center hover:bg-gin-bg-layer2 transition-colors group">
      {/* Name with tree connectors */}
      <div className="flex items-center min-w-0">
        {node.depth > 0 && (
          <span className="inline-flex flex-shrink-0" style={{ width: `${node.depth * 24}px` }}>
            {Array.from({ length: node.depth }, (_, i) => {
              const isCurrentLevel = i === node.depth - 1;
              const isLastAtLevel = i < node.ancestorIsLast.length ? node.ancestorIsLast[i] : false;

              if (isCurrentLevel) {
                return (
                  <span
                    key={i}
                    className="inline-block w-6 h-8 relative flex-shrink-0"
                  >
                    <span
                      className="absolute left-[11px] top-0 w-px bg-gin-border"
                      style={{ height: node.isLastChild ? '50%' : '100%' }}
                    />
                    <span
                      className="absolute left-[11px] top-1/2 h-px bg-gin-border"
                      style={{ width: '11px' }}
                    />
                  </span>
                );
              }
              return (
                <span key={i} className="inline-block w-6 h-8 relative flex-shrink-0">
                  {!isLastAtLevel && (
                    <span className="absolute left-[11px] top-0 w-px h-full bg-gin-border" />
                  )}
                </span>
              );
            })}
          </span>
        )}

        {node.hasChildren ? (
          <button
            onClick={onToggle}
            className="w-5 h-5 flex items-center justify-center text-gin-text-light hover:text-gin-text flex-shrink-0 mr-1"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
          </button>
        ) : (
          <span className="w-5 h-5 flex-shrink-0 mr-1" />
        )}

        <Link
          href={`/structure/taxonomy/${vocabulary}/${node.tid}/edit`}
          className="text-gin-primary hover:underline font-medium truncate"
        >
          {node.title || '(untitled)'}
        </Link>
      </div>

      {/* Content count */}
      <div className="text-center">
        {contentCount > 0 ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gin-primary-light text-gin-primary">
            {contentCount}
          </span>
        ) : (
          <span className="text-gin-text-light text-xs">0</span>
        )}
      </div>

      {/* Weight */}
      <div className="text-center text-gin-text-light text-sm">{node.weight}</div>

      {/* Status */}
      <div className="text-center">
        <span className={`inline-block px-1.5 py-0.5 text-xs rounded-full ${
          node.status ? 'bg-green-100 text-gin-green' : 'bg-gray-100 text-gin-text-light'
        }`}>
          {node.status ? 'On' : 'Off'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1">
        <div className="flex items-center gap-0.5 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUpProp}
            className="p-1 text-gin-text-light hover:text-gin-text disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDownProp}
            className="p-1 text-gin-text-light hover:text-gin-text disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onIndent}
            disabled={!canIndentProp}
            className="p-1 text-gin-text-light hover:text-gin-text disabled:opacity-30 disabled:cursor-not-allowed"
            title="Make child of previous sibling"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOutdent}
            disabled={!canOutdent}
            className="p-1 text-gin-text-light hover:text-gin-text disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move to parent level"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <Link
          href={`/structure/taxonomy/${vocabulary}/add?parent=${node.tid}`}
          className="text-xs text-gin-green hover:underline px-1.5 py-0.5 rounded-gin-s hover:bg-green-50"
          title="Add child term"
        >
          + Child
        </Link>
        <Link
          href={`/structure/taxonomy/${vocabulary}/${node.tid}/edit`}
          className="text-xs text-gin-primary hover:underline px-1.5 py-0.5 rounded-gin-s hover:bg-gin-primary-light"
        >
          Edit
        </Link>
        <button
          onClick={onDelete}
          className="text-xs text-gin-danger hover:underline px-1.5 py-0.5 rounded-gin-s hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
