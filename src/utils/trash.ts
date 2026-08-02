import type {
  ProjectTrash,
  TrashKind,
  TrashListItem,
  TrashedProject,
} from '../types/models';
import { htmlToPlainText } from './content';

export type TrashSortBy = 'deletedAt' | 'createdAt';

function noteExcerpt(contentHtml: string | null | undefined): string | undefined {
  const text = htmlToPlainText(contentHtml);
  return text || undefined;
}

function bundleExcerpt(
  scenes: { title: string; contentHtml: string }[],
): string | undefined {
  if (scenes.length === 0) return '포함된 씬 없음';
  const parts = scenes.slice(0, 2).map((s) => {
    const title = s.title.trim();
    const body = htmlToPlainText(s.contentHtml);
    if (title && body) return `${title}: ${body}`;
    return title || body || '';
  }).filter(Boolean);
  const head = parts.join(' · ');
  if (!head) return `씬 ${scenes.length}개`;
  return scenes.length > 2 ? `${head} 외 ${scenes.length - 2}개` : head;
}

export function buildTrashListItems(
  projectId: string | null,
  trash: ProjectTrash,
  trashedProjects: TrashedProject[],
): TrashListItem[] {
  const items: TrashListItem[] = [];

  for (const t of trash.scenes) {
    items.push({
      id: t.scene.id,
      kind: 'scene',
      title: t.scene.title.trim(),
      excerpt: noteExcerpt(t.scene.contentHtml),
      deletedAt: t.deletedAt,
      createdAt: t.scene.createdAt,
      projectId: projectId ?? undefined,
    });
  }
  for (const t of trash.references) {
    items.push({
      id: t.reference.id,
      kind: 'reference',
      title: t.reference.title.trim(),
      excerpt: noteExcerpt(t.reference.contentHtml),
      deletedAt: t.deletedAt,
      createdAt: t.reference.createdAt,
      projectId: projectId ?? undefined,
    });
  }
  for (const t of trash.bundles) {
    items.push({
      id: t.document.id,
      kind: 'documentBundle',
      title: t.document.title.trim(),
      excerpt: bundleExcerpt(t.scenes),
      deletedAt: t.deletedAt,
      createdAt: t.document.createdAt,
      projectId: projectId ?? undefined,
    });
  }
  for (const t of trashedProjects) {
    items.push({
      id: t.project.id,
      kind: 'project',
      title: t.project.title.trim() || '(제목 없음)',
      deletedAt: t.deletedAt,
      createdAt: t.project.createdAt,
    });
  }

  return items;
}

export function sortTrashItems(
  items: TrashListItem[],
  sortBy: TrashSortBy,
): TrashListItem[] {
  const key = sortBy;
  return [...items].sort((a, b) => b[key].localeCompare(a[key]));
}

export function trashKindLabel(kind: TrashKind): string {
  switch (kind) {
    case 'scene':
      return '씬';
    case 'reference':
      return '참고';
    case 'documentBundle':
      return '문서';
    case 'project':
      return '프로젝트';
  }
}
