import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TextEncodingService {

  constructor() { }

  /**
   * Detects if text contains Arabic characters
   */
  isArabicText(text: string): boolean {
    if (!text) return false;
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return arabicRegex.test(text);
  }

  /**
   * Detects if text contains RTL characters (Arabic, Hebrew, etc.)
   */
  isRTLText(text: string): boolean {
    if (!text) return false;
    const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
    return rtlRegex.test(text);
  }

  /**
   * Attempts to fix common encoding issues in text
   */
  fixTextEncoding(text: string): string {
    if (!text) return text;

    try {
      // Check if text contains common encoding artifacts
      if (this.containsEncodingArtifacts(text)) {
        // Try to decode common encoding issues
        return this.decodeTextArtifacts(text);
      }
      return text;
    } catch (error) {
      console.warn('Error fixing text encoding:', error);
      return text;
    }
  }

  /**
   * Checks if text contains common encoding artifacts
   */
  private containsEncodingArtifacts(text: string): boolean {
    // Common patterns that indicate encoding issues
    const artifactPatterns = [
      /[^\x00-\x7F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/,
      /[^\u0000-\uFFFF]/,
      /\uFFFD/g // Replacement character
    ];

    return artifactPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Attempts to decode common text encoding artifacts
   */
  private decodeTextArtifacts(text: string): string {
    try {
      // Common encoding fixes
      let fixedText = text;

      // Fix common UTF-8 encoding issues
      fixedText = fixedText
        .replace(/\u00C2\u00A0/g, '\u00A0') // Non-breaking space
        .replace(/\u00C3\u00A1/g, 'á')
        .replace(/\u00C3\u00A9/g, 'é')
        .replace(/\u00C3\u00AD/g, 'í')
        .replace(/\u00C3\u00B3/g, 'ó')
        .replace(/\u00C3\u00BA/g, 'ú')
        .replace(/\u00C3\u00B1/g, 'ñ')
        .replace(/\u00C3\u00A7/g, 'ç');

      // Fix Arabic encoding issues
      fixedText = this.fixArabicEncoding(fixedText);

      return fixedText;
    } catch (error) {
      console.warn('Error decoding text artifacts:', error);
      return text;
    }
  }

  /**
   * Fixes common Arabic encoding issues
   */
  private fixArabicEncoding(text: string): string {
    try {
      // Common Arabic encoding mappings
      const arabicMappings: { [key: string]: string } = {
        'د': 'د',
        'ر': 'ر',
        'و': 'و',
        'ن': 'ن',
        'م': 'م',
        'ل': 'ل',
        'ك': 'ك',
        'ق': 'ق',
        'ف': 'ف',
        'غ': 'غ',
        'ع': 'ع',
        'ظ': 'ظ',
        'ط': 'ط',
        'ض': 'ض',
        'ص': 'ص',
        'ش': 'ش',
        'س': 'س',
        'ز': 'ز',
        'ي': 'ي',
        'ب': 'ب',
        'ا': 'ا',
        'ت': 'ت',
        'ث': 'ث',
        'ج': 'ج',
        'ح': 'ح',
        'خ': 'خ',
        'ذ': 'ذ'
      };

      let fixedText = text;
      
      // Apply mappings
      Object.entries(arabicMappings).forEach(([wrong, correct]) => {
        fixedText = fixedText.replace(new RegExp(wrong, 'g'), correct);
      });

      return fixedText;
    } catch (error) {
      console.warn('Error fixing Arabic encoding:', error);
      return text;
    }
  }

  /**
   * Normalizes text for display
   */
  normalizeTextForDisplay(text: string): string {
    if (!text) return text;

    try {
      // Fix encoding issues
      let normalizedText = this.fixTextEncoding(text);

      // Normalize Unicode
      normalizedText = normalizedText.normalize('NFC');

      // Clean up extra whitespace
      normalizedText = normalizedText.replace(/\s+/g, ' ').trim();

      return normalizedText;
    } catch (error) {
      console.warn('Error normalizing text:', error);
      return text;
    }
  }

  /**
   * Gets the appropriate CSS class for text direction
   */
  getTextDirectionClass(text: string): string {
    if (this.isRTLText(text)) {
      return 'rtl-text';
    }
    return 'ltr-text';
  }

  /**
   * Gets the appropriate HTML dir attribute
   */
  getTextDirection(text: string): 'rtl' | 'ltr' {
    return this.isRTLText(text) ? 'rtl' : 'ltr';
  }
}

