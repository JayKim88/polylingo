// Claude 3 Haiku API translation utility

export async function translateWithClaude(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{ translation: string; pronunciation?: string }> {
  const apiKey = process.env.CLAUDE_API_KEY || 'YOUR_CLAUDE_API_KEY';

  // 한국어 → 영어 번역 시 특별한 프롬프트 사용
  let prompt: string;

  if (sourceLang === 'Korean' && targetLang === 'English') {
    prompt = `Translate the following Korean text to English and provide ONLY the English pronunciation (IPA format) of the translated English word/phrase.

IMPORTANT: 
- The pronunciation should be for the ENGLISH translation, NOT the Korean original
- Use IPA (International Phonetic Alphabet) format for English pronunciation
- For example: "안녕" → "hello" → pronunciation: "/həˈloʊ/" or "/hɛˈloʊ/"
- Return ONLY the following JSON. Do not include any explanation, description, or extra text.
- Your response must be a single line JSON object, nothing else.

Text: ${text}

Return the result in this exact JSON format:
{"translation": "<English translation>", "pronunciation": "<IPA pronunciation of English word>"}`;
  } else {
    prompt = `Translate the following ${sourceLang} text to ${targetLang} and provide the pronunciation of the translated ${targetLang} text.

IMPORTANT: 
- The pronunciation must be for the TRANSLATED ${targetLang} text, NOT the original ${sourceLang} text.
- If the target language is not written in the Latin alphabet, provide the pronunciation in Romanized form or IPA.
- DO NOT use the original script for the pronunciation if it is not Latin.
- Return ONLY the following JSON. Do not include any explanation, description, or extra text.
- Your response must be a single line JSON object, nothing else.
- Before returning the result, check again if the pronunciation is for the translated ${targetLang} text and fix it if is required.


Text: ${text}

Return the result in this exact JSON format:
{"translation": "<translated text>", "pronunciation": "<pronunciation of translated text>"}`;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    const text = await response.text();
    console.log('Claude API error (raw text):', text);
    throw new Error('Claude API returned non-JSON response');
  }
  if (!response.ok) {
    console.log('Claude API error:', data);
    throw new Error(data?.error?.message || 'Claude API error');
  }

  const content = data?.content?.[0]?.text ?? '';
  let translation = '';
  let pronunciation = '';
  try {
    const parsed = JSON.parse(content);
    translation = parsed.translation;
    pronunciation = parsed.pronunciation;
  } catch {
    translation = content;
  }

  return { translation, pronunciation };
}
