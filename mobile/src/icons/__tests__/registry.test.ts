import fs from 'fs';
import path from 'path';

import firstAidContent from '../../content/first-aid-content.json';
import {
  ICON_REGISTRY,
  LASO_GLYPHS,
  PHOSPHOR_ICONS,
  isIconName,
  resolveIconName,
} from '../registry';

const collectIconFields = (value: unknown, found: string[] = []): string[] => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectIconFields(item, found));
    return found;
  }

  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      if ((key === 'icon' || key === 'illustration_icon') && typeof child === 'string') {
        found.push(child);
        return;
      }
      collectIconFields(child, found);
    });
  }

  return found;
};

const walkSourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__tests__' || entry.name === '__mocks__') return [];

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkSourceFiles(fullPath);
    return /\.tsx?$/.test(entry.name) ? [fullPath] : [];
  });

const literalIconNames = (): Array<{ file: string; name: string }> => {
  const sourceRoot = path.resolve(__dirname, '../..');
  const iconTagPattern = /<Icon\b[^>]*?\bname=(?:"([^"]+)"|'([^']+)'|\{\s*["']([^"']+)["']\s*\})/g;

  return walkSourceFiles(sourceRoot).flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');
    const names: Array<{ file: string; name: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = iconTagPattern.exec(source)) !== null) {
      names.push({
        file: path.relative(sourceRoot, file),
        name: match[1] ?? match[2] ?? match[3],
      });
    }

    return names;
  });
};

describe('icon registry', () => {
  it('provides a renderer for every registered icon', () => {
    Object.entries(ICON_REGISTRY).forEach(([name, renderer]) => {
      expect(typeof renderer).toBe('function');
      expect(name.length).toBeGreaterThan(0);
    });
  });

  it('keeps Phosphor and Laso icon names disjoint', () => {
    const overlaps = Object.keys(PHOSPHOR_ICONS).filter((name) =>
      Object.prototype.hasOwnProperty.call(LASO_GLYPHS, name)
    );

    expect(overlaps).toEqual([]);
  });

  it('resolves every icon referenced by first-aid content', () => {
    const contentIcons = collectIconFields(firstAidContent);
    const unresolved = contentIcons.filter((name) => !isIconName(name));

    expect(unresolved).toEqual([]);
  });

  it('only references registered icon names in Icon literals', () => {
    const unresolved = literalIconNames().filter(({ name }) => !isIconName(name));

    expect(unresolved).toEqual([]);
  });

  it('falls back to a safe glyph for unknown names', () => {
    expect(resolveIconName(undefined)).toBe('triagePulse');
    expect(resolveIconName('')).toBe('triagePulse');
    expect(resolveIconName('not-a-real-icon')).toBe('triagePulse');
    expect(resolveIconName('cpr')).toBe('cpr');
  });
});
