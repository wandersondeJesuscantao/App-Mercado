import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzeProductImage = async (base64Image: string): Promise<AIResponse | null> => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing");
      return null;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "Analise esta imagem de um produto e seu preço em um supermercado. Extraia o nome do produto, o preço numérico e determine se o preço está barato, justo ou caro baseado em médias de mercado brasileiras. Retorne um JSON.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            price: { type: Type.NUMBER },
            category: { type: Type.STRING },
            analysis: { 
              type: Type.STRING, 
              enum: ["barato", "justo", "caro"] 
            },
            suggestion: { type: Type.STRING },
          },
          required: ["productName", "price", "category", "analysis", "suggestion"],
        },
      },
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text) as AIResponse;
    }
    return null;
  } catch (error) {
    console.error("Error analyzing image:", error);
    return null;
  }
};

export const getAIAssistance = async (prompt: string, context: string) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return "Erro: Chave de API não configurada.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é uma assistente virtual para donas de casa brasileiras chamada 'Faça suas Comprar de Mercado'. 
      Seu objetivo é ajudar a economizar, organizar finanças e dar dicas de casa/receitas.
      Contexto atual: ${context}
      Pergunta do usuário: ${prompt}`,
    });
    return response.text;
  } catch (error) {
    console.error("Error getting AI assistance:", error);
    return "Desculpe, tive um problema ao processar sua solicitação. Verifique sua conexão ou tente novamente mais tarde.";
  }
};
