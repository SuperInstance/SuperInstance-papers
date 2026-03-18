declare module 'react-markdown' {
  import { ComponentType, ReactNode } from 'react';

  interface ReactMarkdownProps {
    children?: ReactNode;
    className?: string;
    components?: {
      [key: string]: ComponentType<{ children?: ReactNode; [key: string]: unknown }>;
    };
    [key: string]: unknown;
  }

  const ReactMarkdown: ComponentType<ReactMarkdownProps>;
  export default ReactMarkdown;
}
