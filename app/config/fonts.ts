export interface FontOption {
  name: string;
  label: string;
  family: string;
  weights: number[];
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting';
}

export const fonts: FontOption[] = [
  {
    name: 'be-vietnam-pro',
    label: 'Be Vietnam Pro',
    family: "'Be Vietnam Pro', sans-serif",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    category: 'sans-serif',
  },
  {
    name: 'inter',
    label: 'Inter',
    family: "'Inter', sans-serif",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    category: 'sans-serif',
  },
  {
    name: 'noto-sans',
    label: 'Noto Sans',
    family: "'Noto Sans', sans-serif",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    category: 'sans-serif',
  },
  {
    name: 'poppins',
    label: 'Poppins',
    family: "'Poppins', sans-serif",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    category: 'sans-serif',
  },
  {
    name: 'roboto',
    label: 'Roboto',
    family: "'Roboto', sans-serif",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    category: 'sans-serif',
  },
  {
    name: 'open-sans',
    label: 'Open Sans',
    family: "'Open Sans', sans-serif",
    weights: [300, 400, 500, 600, 700, 800],
    category: 'sans-serif',
  },
  {
    name: 'lato',
    label: 'Lato',
    family: "'Lato', sans-serif",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    category: 'sans-serif',
  },
  {
    name: 'montserrat',
    label: 'Montserrat',
    family: "'Montserrat', sans-serif",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    category: 'sans-serif',
  },
  {
    name: 'raleway',
    label: 'Raleway',
    family: "'Raleway', sans-serif",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    category: 'sans-serif',
  },
  {
    name: 'nunito',
    label: 'Nunito',
    family: "'Nunito', sans-serif",
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    category: 'sans-serif',
  },
  {
    name: 'source-sans-3',
    label: 'Source Sans 3',
    family: "'Source Sans 3', sans-serif",
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    category: 'sans-serif',
  },
  {
    name: 'work-sans',
    label: 'Work Sans',
    family: "'Work Sans', sans-serif",
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    category: 'sans-serif',
  },
  {
    name: 'quicksand',
    label: 'Quicksand',
    family: "'Quicksand', sans-serif",
    weights: [300, 400, 500, 600, 700],
    category: 'sans-serif',
  },
  {
    name: 'merriweather',
    label: 'Merriweather',
    family: "'Merriweather', serif",
    weights: [300, 400, 700, 900],
    category: 'serif',
  },
  {
    name: 'playfair-display',
    label: 'Playfair Display',
    family: "'Playfair Display', serif",
    weights: [400, 500, 600, 700, 800, 900],
    category: 'serif',
  },
  {
    name: 'crimson-text',
    label: 'Crimson Text',
    family: "'Crimson Text', serif",
    weights: [400, 600, 700],
    category: 'serif',
  },
];

export const getFontByName = (name: string): FontOption | undefined => {
  return fonts.find((font) => font.name === name);
};

export const getGoogleFontsUrl = (fontName: string, weights: number[] = [400, 600]): string => {
  const font = getFontByName(fontName);
  if (!font) return '';
  
  const weightsStr = weights.join(';');
  return `https://fonts.googleapis.com/css2?family=${font.name.replace(' ', '+')}:wght@${weightsStr}&display=swap`;
};

export const defaultFont = fonts[0];
