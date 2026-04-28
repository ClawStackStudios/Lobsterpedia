export const scuttleWikiIndex = async () => {
  const response = await fetch('/api/wiki/index');
  if (!response.ok) throw new Error('isCracked: Failed to scuttle index');
  return response.json();
};

export const moltSynthesizeSource = async (pearl: { title: string, text: string }) => {
  const response = await fetch('/api/wiki/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pearl)
  });
  if (!response.ok) throw new Error('isCracked: Synthesis failed');
  return response.json();
};
