import { LASO_GLYPHS, type LasoGlyphName } from '../glyphs';

export { LASO_GLYPHS };
export type { LasoGlyphName };

export const isLasoGlyph = (name: string): name is LasoGlyphName => {
  return Object.prototype.hasOwnProperty.call(LASO_GLYPHS, name);
};
