import React from 'react';
import { Text, StyleSheet, Linking } from 'react-native';
import { theme } from '../theme';

// Global key counter to ensure unique keys across all markdown renders
let globalKeyCounter = 0;

interface MarkdownTextProps {
  content: string;
  style?: any;
  textStyle?: any;
}

/**
 * Simple markdown parser for React Native
 * Handles: **bold**, *italic*, `code`, [links](url), and line breaks
 */
export const MarkdownText: React.FC<MarkdownTextProps> = ({ 
  content, 
  style,
  textStyle 
}) => {
  const parseMarkdown = (text: string, baseKey: number): React.ReactNode[] => {
    if (!text) return [];

    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let key = baseKey;

    // Regex patterns for markdown elements
    const patterns = [
      // Links: [text](url)
      { 
        regex: /\[([^\]]+)\]\(([^)]+)\)/g, 
        type: 'link' 
      },
      // Bold: **text**
      { 
        regex: /\*\*([^*]+)\*\*/g, 
        type: 'bold' 
      },
      // Italic: *text* (but not **text**)
      { 
        regex: /(?<!\*)\*([^*]+)\*(?!\*)/g, 
        type: 'italic' 
      },
      // Code: `text`
      { 
        regex: /`([^`]+)`/g, 
        type: 'code' 
      },
    ];

    // Find all matches with their positions
    const matches: Array<{
      start: number;
      end: number;
      type: string;
      content: string;
      url?: string;
    }> = [];

    patterns.forEach(({ regex, type }) => {
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type,
          content: match[1],
          url: type === 'link' ? match[2] : undefined,
        });
      }
    });

    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);

    // Remove overlapping matches (prioritize first match)
    const filteredMatches: typeof matches = [];
    let lastEnd = 0;
    matches.forEach((match) => {
      if (match.start >= lastEnd) {
        filteredMatches.push(match);
        lastEnd = match.end;
      }
    });

    // Build parts array
    filteredMatches.forEach((match) => {
      // Add text before match
      if (match.start > currentIndex) {
        const beforeText = text.substring(currentIndex, match.start);
        if (beforeText) {
          parts.push(
            <Text key={`text-${key++}`} style={textStyle}>
              {beforeText}
            </Text>
          );
        }
      }

      // Add formatted match
      switch (match.type) {
        case 'bold':
          parts.push(
            <Text key={`bold-${key++}`} style={[textStyle, styles.bold]}>
              {match.content}
            </Text>
          );
          break;
        case 'italic':
          parts.push(
            <Text key={`italic-${key++}`} style={[textStyle, styles.italic]}>
              {match.content}
            </Text>
          );
          break;
        case 'code':
          parts.push(
            <Text key={`code-${key++}`} style={[textStyle, styles.code]}>
              {match.content}
            </Text>
          );
          break;
        case 'link':
          parts.push(
            <Text
              key={`link-${key++}`}
              style={[textStyle, styles.link]}
              onPress={() => {
                if (match.url) {
                  Linking.openURL(match.url).catch((err) =>
                    console.error('Failed to open URL:', err)
                  );
                }
              }}
            >
              {match.content}
            </Text>
          );
          break;
      }

      currentIndex = match.end;
    });

    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      if (remainingText) {
        parts.push(
          <Text key={`text-${key++}`} style={textStyle}>
            {remainingText}
          </Text>
        );
      }
    }

    // If no matches found, return plain text
    if (parts.length === 0) {
      return [
        <Text key={`text-${key}`} style={textStyle}>
          {text}
        </Text>,
      ];
    }

    return parts;
  };

  // Split by line breaks and process each line
  const lines = content.split('\n');
  const processedLines: React.ReactNode[] = [];
  let globalKey = globalKeyCounter;

  lines.forEach((line, index) => {
    if (line.trim()) {
      const parsed = parseMarkdown(line, globalKey);
      globalKey += parsed.length;
      processedLines.push(...parsed);
    }
    // Add line break (except for last line)
    if (index < lines.length - 1) {
      processedLines.push(<Text key={`br-${globalKey++}`}>{'\n'}</Text>);
    }
  });

  // Update global counter
  globalKeyCounter = globalKey;

  return (
    <Text style={style}>
      {processedLines}
    </Text>
  );
};

const styles = StyleSheet.create({
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
  },
  link: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});

export default MarkdownText;

