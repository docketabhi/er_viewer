/**
 * Mermaid language definition for Monaco Editor.
 *
 * Provides syntax highlighting for Mermaid diagrams including:
 * - erDiagram (Entity Relationship)
 * - flowchart / graph
 * - sequenceDiagram
 * - classDiagram
 * - stateDiagram
 * - gantt
 * - pie
 * - mindmap
 *
 * Special support for custom %%block: directives used in nested ER blocks feature.
 */

import type * as Monaco from 'monaco-editor';

export const MERMAID_LANGUAGE_ID = 'mermaid';

/**
 * Language configuration for Mermaid.
 * Defines brackets, comments, and auto-closing pairs.
 */
export const mermaidLanguageConfiguration: Monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '%%',
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string'] },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  folding: {
    markers: {
      start: /^\s*%%\s*region\b/,
      end: /^\s*%%\s*endregion\b/,
    },
  },
};

/**
 * Monarch tokenizer definition for Mermaid syntax.
 * Uses Monaco's Monarch token provider for syntax highlighting.
 */
export const mermaidTokensProvider: Monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  ignoreCase: false,

  // Diagram type keywords
  diagramTypes: [
    'erDiagram',
    'flowchart',
    'graph',
    'sequenceDiagram',
    'classDiagram',
    'stateDiagram',
    'stateDiagram-v2',
    'gantt',
    'pie',
    'mindmap',
    'journey',
    'gitGraph',
    'requirementDiagram',
    'C4Context',
    'C4Container',
    'C4Component',
    'C4Dynamic',
    'C4Deployment',
    'quadrantChart',
    'xychart-beta',
    'block-beta',
    'sankey-beta',
    'timeline',
    'zenuml',
  ],

  // ER diagram specific keywords
  erKeywords: [
    'title',
  ],

  // Flowchart keywords
  flowchartKeywords: [
    'subgraph',
    'end',
    'direction',
    'TB',
    'TD',
    'BT',
    'RL',
    'LR',
  ],

  // Sequence diagram keywords
  sequenceKeywords: [
    'participant',
    'actor',
    'activate',
    'deactivate',
    'Note',
    'note',
    'over',
    'right',
    'left',
    'of',
    'loop',
    'alt',
    'else',
    'opt',
    'par',
    'and',
    'critical',
    'option',
    'break',
    'rect',
    'autonumber',
    'title',
  ],

  // Class diagram keywords
  classKeywords: [
    'class',
    'namespace',
    'direction',
  ],

  // State diagram keywords
  stateKeywords: [
    'state',
    'direction',
    'note',
  ],

  // Gantt chart keywords
  ganttKeywords: [
    'dateFormat',
    'title',
    'excludes',
    'section',
    'todayMarker',
    'axisFormat',
    'tickInterval',
  ],

  // Common keywords across diagrams
  commonKeywords: [
    'style',
    'classDef',
    'click',
    'callback',
    'link',
    'linkStyle',
  ],

  // ER relationship symbols (matched as operators)
  erRelationships: [
    '||--o{',
    '}o--||',
    '||--|{',
    '}|--||',
    '||--||',
    '}o--o{',
    '}|--|{',
    '||..o{',
    '}o..||',
    '||..|{',
    '}|..||',
    '||..||',
    '}o..o{',
    '}|..|{',
    'o{--||',
    '||--{',
    '}--||',
    'o|--||',
    '||--o|',
  ],

  // Operators and symbols
  operators: [
    '-->',
    '---',
    '-.->',
    '-..-',
    '-.-',
    '==>',
    '===',
    '~~>',
    '~~~',
    '--x',
    '--o',
    'x--',
    'o--',
    '<<',
    '>>',
    '->',
    '<-',
    '->>',
    '<<-',
    ':',
    '|',
  ],

  // Tokenizer rules
  tokenizer: {
    root: [
      // Block directive (custom ER viewer feature) - highest priority
      [/%%block:.*$/, 'annotation'],

      // Mermaid directive blocks %%{ }%%
      [/%%\{/, { token: 'annotation', next: '@directiveBlock' }],

      // Comments
      [/%%.*$/, 'comment'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@stringDouble'],
      [/'/, 'string', '@stringSingle'],

      // Labels in square brackets
      [/\[/, { token: 'delimiter.bracket', next: '@bracketLabel' }],

      // Labels in pipes (for flowchart nodes like A[|text|])
      [/\|([^|]*)\|/, 'string.label'],

      // Entity names and identifiers (before keywords to not override)
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@diagramTypes': 'keyword.diagram',
          '@erKeywords': 'keyword.er',
          '@flowchartKeywords': 'keyword.flowchart',
          '@sequenceKeywords': 'keyword.sequence',
          '@classKeywords': 'keyword.class',
          '@stateKeywords': 'keyword.state',
          '@ganttKeywords': 'keyword.gantt',
          '@commonKeywords': 'keyword',
          '@default': 'identifier',
        },
      }],

      // Numbers
      [/\d+/, 'number'],

      // ER relationship operators (complex patterns)
      [/\|\|--o\{/, 'operator.relationship'],
      [/\}o--\|\|/, 'operator.relationship'],
      [/\|\|--\|\{/, 'operator.relationship'],
      [/\}\|--\|\|/, 'operator.relationship'],
      [/\|\|--\|\|/, 'operator.relationship'],
      [/\}o--o\{/, 'operator.relationship'],
      [/\}\|--\|\{/, 'operator.relationship'],
      [/\|\|\.\.o\{/, 'operator.relationship'],
      [/\}o\.\.\|\|/, 'operator.relationship'],
      [/\|\|\.\.\|\{/, 'operator.relationship'],
      [/\}\|\.\.\|\|/, 'operator.relationship'],
      [/\|\|\.\.\|\|/, 'operator.relationship'],
      [/\}o\.\.o\{/, 'operator.relationship'],
      [/\}\|\.\.\|\{/, 'operator.relationship'],
      [/o\{--\|\|/, 'operator.relationship'],
      [/\|\|--\{/, 'operator.relationship'],
      [/\}--\|\|/, 'operator.relationship'],
      [/o\|--\|\|/, 'operator.relationship'],
      [/\|\|--o\|/, 'operator.relationship'],

      // Flowchart arrows and connections
      [/-->/, 'operator.arrow'],
      [/---/, 'operator.arrow'],
      [/-\.->/, 'operator.arrow'],
      [/===>/, 'operator.arrow'],
      [/===/, 'operator.arrow'],
      [/~~>/, 'operator.arrow'],
      [/~~~/, 'operator.arrow'],
      [/--x/, 'operator.arrow'],
      [/--o/, 'operator.arrow'],
      [/x--/, 'operator.arrow'],
      [/o--/, 'operator.arrow'],
      [/->>/, 'operator.arrow'],
      [/<<-/, 'operator.arrow'],
      [/->/, 'operator.arrow'],
      [/<-/, 'operator.arrow'],
      [/<</, 'operator.arrow'],
      [/>>/, 'operator.arrow'],

      // Delimiters and brackets
      [/[{}()\[\]]/, 'delimiter.bracket'],
      [/:/, 'delimiter'],
      [/;/, 'delimiter'],
      [/\|/, 'delimiter'],

      // Whitespace
      [/\s+/, ''],
    ],

    // Directive block state %%{ ... }%%
    directiveBlock: [
      [/\}%%/, { token: 'annotation', next: '@pop' }],
      [/./, 'annotation'],
    ],

    // Double-quoted string state
    stringDouble: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],

    // Single-quoted string state
    stringSingle: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@pop'],
    ],

    // Square bracket label state [text]
    bracketLabel: [
      [/[^\]]+/, 'string.label'],
      [/\]/, { token: 'delimiter.bracket', next: '@pop' }],
    ],
  },
};

/**
 * Theme rules for Mermaid syntax highlighting.
 * These rules extend the base Monaco theme with Mermaid-specific colors.
 */
export const mermaidThemeRules: Monaco.editor.ITokenThemeRule[] = [
  // Diagram type keywords (e.g., erDiagram, flowchart)
  { token: 'keyword.diagram', foreground: 'C586C0', fontStyle: 'bold' },

  // ER diagram keywords
  { token: 'keyword.er', foreground: '569CD6' },

  // Flowchart keywords
  { token: 'keyword.flowchart', foreground: '4EC9B0' },

  // Sequence diagram keywords
  { token: 'keyword.sequence', foreground: 'DCDCAA' },

  // Class diagram keywords
  { token: 'keyword.class', foreground: '4EC9B0' },

  // State diagram keywords
  { token: 'keyword.state', foreground: '4EC9B0' },

  // Gantt chart keywords
  { token: 'keyword.gantt', foreground: 'CE9178' },

  // General keywords
  { token: 'keyword', foreground: '569CD6' },

  // Identifiers (entity names, node names)
  { token: 'identifier', foreground: '9CDCFE' },

  // ER relationship operators
  { token: 'operator.relationship', foreground: 'D4D4D4', fontStyle: 'bold' },

  // Arrow operators
  { token: 'operator.arrow', foreground: 'D4D4D4' },

  // Comments
  { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },

  // Annotations (%%block: directives, %%{ }%%)
  { token: 'annotation', foreground: '608B4E', fontStyle: 'italic' },

  // Strings
  { token: 'string', foreground: 'CE9178' },
  { token: 'string.label', foreground: 'CE9178' },
  { token: 'string.escape', foreground: 'D7BA7D' },
  { token: 'string.invalid', foreground: 'F44747' },

  // Numbers
  { token: 'number', foreground: 'B5CEA8' },

  // Delimiters
  { token: 'delimiter', foreground: 'D4D4D4' },
  { token: 'delimiter.bracket', foreground: 'FFD700' },
];

/**
 * Light theme rules for Mermaid syntax highlighting.
 */
export const mermaidLightThemeRules: Monaco.editor.ITokenThemeRule[] = [
  // Diagram type keywords
  { token: 'keyword.diagram', foreground: 'AF00DB', fontStyle: 'bold' },

  // ER diagram keywords
  { token: 'keyword.er', foreground: '0000FF' },

  // Flowchart keywords
  { token: 'keyword.flowchart', foreground: '267F99' },

  // Sequence diagram keywords
  { token: 'keyword.sequence', foreground: '795E26' },

  // Class diagram keywords
  { token: 'keyword.class', foreground: '267F99' },

  // State diagram keywords
  { token: 'keyword.state', foreground: '267F99' },

  // Gantt chart keywords
  { token: 'keyword.gantt', foreground: 'A31515' },

  // General keywords
  { token: 'keyword', foreground: '0000FF' },

  // Identifiers
  { token: 'identifier', foreground: '001080' },

  // ER relationship operators
  { token: 'operator.relationship', foreground: '000000', fontStyle: 'bold' },

  // Arrow operators
  { token: 'operator.arrow', foreground: '000000' },

  // Comments
  { token: 'comment', foreground: '008000', fontStyle: 'italic' },

  // Annotations
  { token: 'annotation', foreground: '008000', fontStyle: 'italic' },

  // Strings
  { token: 'string', foreground: 'A31515' },
  { token: 'string.label', foreground: 'A31515' },
  { token: 'string.escape', foreground: 'EE0000' },
  { token: 'string.invalid', foreground: 'CD3131' },

  // Numbers
  { token: 'number', foreground: '098658' },

  // Delimiters
  { token: 'delimiter', foreground: '000000' },
  { token: 'delimiter.bracket', foreground: 'AF00DB' },
];

/**
 * Registers the Mermaid language with Monaco Editor.
 * Should be called once when the editor is mounted.
 *
 * @param monaco - The Monaco namespace from the editor
 */
export function registerMermaidLanguage(monaco: typeof Monaco): void {
  // Check if language is already registered
  const languages = monaco.languages.getLanguages();
  const isRegistered = languages.some((lang) => lang.id === MERMAID_LANGUAGE_ID);

  if (isRegistered) {
    return;
  }

  // Register the language
  monaco.languages.register({
    id: MERMAID_LANGUAGE_ID,
    extensions: ['.mmd', '.mermaid'],
    aliases: ['Mermaid', 'mermaid'],
    mimetypes: ['text/x-mermaid'],
  });

  // Set language configuration
  monaco.languages.setLanguageConfiguration(
    MERMAID_LANGUAGE_ID,
    mermaidLanguageConfiguration
  );

  // Set token provider
  monaco.languages.setMonarchTokensProvider(
    MERMAID_LANGUAGE_ID,
    mermaidTokensProvider
  );

  // Define custom dark theme with Mermaid rules
  monaco.editor.defineTheme('mermaid-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: mermaidThemeRules,
    colors: {},
  });

  // Define custom light theme with Mermaid rules
  monaco.editor.defineTheme('mermaid-light', {
    base: 'vs',
    inherit: true,
    rules: mermaidLightThemeRules,
    colors: {},
  });
}

export default registerMermaidLanguage;
