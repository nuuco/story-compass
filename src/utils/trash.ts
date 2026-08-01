import type {
  ProjectTrash,
  TrashKind,
  TrashListItem,
  TrashedProject,
} from '../types/models';

export type TrashSortBy = 'deletedAt' | 'createdAt';

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
      title: t.scene.title.trim() || '(제목 없음)',
      deletedAt: t.deletedAt,
      createdAt: t.scene.createdAt,
      projectId: projectId ?? undefined,
    });
  }
  for (const t of trash.references) {
    items.push({
      id: t.reference.id,
      kind: 'reference',
      title: t.reference.title.trim() || '(제목 없음)',
      deletedAt: t.deletedAt,
      createdAt: t.reference.createdAt,
      projectId: projectId ?? undefined,
    });
  }
  for (const t of trash.bundles) {
    items.push({
      id: t.document.id,
      kind: 'documentBundle',
      title: t.document.title.trim() || '(제목 없음)',
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
