// import translate from 'google-translate-api-x';

export class PronunciationService {
  // Free pronunciation API endpoint for english
  private static readonly PHONEME_API =
    'https://api.dictionaryapi.dev/api/v2/entries/en';

  // Get pronunciation using Google Translate API
  static async getPronunciation(
    word: string,
    languageCode: string
  ): Promise<string | null> {
    try {
      /**
       * @description not working properly.
       */
      // const googlePronunciation = await this.getGoogleTranslatePronunciation(
      //   word,
      //   languageCode
      // );

      // if (googlePronunciation) {
      //   return googlePronunciation;
      // }

      if (languageCode === 'en') {
        const dictPronunciation = await this.getEnglishPronunciation(word);
        if (dictPronunciation) {
          return dictPronunciation;
        }
      }

      return null;
    } catch (error) {
      console.log(`🔤 Pronunciation error for "${word}":`, error);
      return null;
    }
  }

  // Fetch English pronunciation from Dictionary API
  private static async getEnglishPronunciation(
    word: string
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.PHONEME_API}/${encodeURIComponent(word)}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const entry = data[0];

        if (entry.phonetics && entry.phonetics.length > 0) {
          for (const phonetic of entry.phonetics) {
            if (phonetic.text) {
              return phonetic.text;
            }
          }
        }

        // Look for phonetics in word meanings
        if (entry.meanings && entry.meanings.length > 0) {
          for (const meaning of entry.meanings) {
            if (meaning.phonetics && meaning.phonetics.length > 0) {
              const phonetic = meaning.phonetics[0];
              if (phonetic.text) {
                return phonetic.text;
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.log(`🔤 Dictionary API error for "${word}":`, error);
      return null;
    }
  }
}
