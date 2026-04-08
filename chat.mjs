import OpenAI from "openai";

const prompt = process.argv.slice(2).join(" ");

if (!prompt) {
  console.error('Usage: openai-chat "your prompt here"');
  process.exit(1);
}

const client = new OpenAI();

const response = await client.responses.create({
  model: "gpt-4.1-mini",
  input: prompt
});

console.log(response.output_text);
