// Claude 3 Haiku API translation utility

export async function translateWithClaude(
  text: string,
  targetLang: string
): Promise<{ translation: string; pronunciation?: string }> {
  const apiKey = process.env.CLAUDE_API_KEY || 'YOUR_CLAUDE_API_KEY';
  const prompt = `Translate the following text to ${targetLang} and provide 
  the pronunciation of the translated text(IPA or romanized if available and for example, if the translated language is English, the pronunciation should be for English."). 
  Return the result in the following JSON format without additional explantion or extra words: 
  {"translation": "<translated text>", "pronunciation": "<IPA or romanized pronunciation>"}\nText: ${text}`;

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
