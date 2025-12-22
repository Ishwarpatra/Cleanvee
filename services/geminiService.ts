import { GoogleGenAI, Type } from "@google/genai";
import { CleaningLog, Checkpoint, ShiftReport } from "../types";

// Helper to sanitize logs for prompt
const formatLogsForPrompt = (logs: CleaningLog[], checkpoints: Checkpoint[]) => {
  return logs.map(log => {
    const cp = checkpoints.find(c => c.id === log.checkpoint_id);
    return {
      time: log.proof_of_presence.nfc_tap_timestamp,
      location: cp?.location_label || "Unknown",
      status: log.verification_result.status,
      ai_score: log.proof_of_quality?.overall_score || 0,
      issues: log.proof_of_quality?.detected_objects.map(o => o.label).join(", ") || "None"
    };
  });
};

export const generateShiftReport = async (logs: CleaningLog[], checkpoints: Checkpoint[]): Promise<ShiftReport | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in environment variables");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  const simplifiedLogs = formatLogsForPrompt(logs, checkpoints);
  
  const prompt = `
    You are an advanced Facility Management AI Assistant for "VeriClean".
    Analyze the following cleaning logs for the current shift and generate a structured executive summary.
    
    Data:
    ${JSON.stringify(simplifiedLogs)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            complianceScore: { 
              type: Type.NUMBER,
              description: "Overall compliance score from 0 to 100 based on verified logs vs expected."
            },
            keyIssues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of critical issues, hazards, or rejected logs detected."
            },
            efficiencyInsight: {
              type: Type.STRING,
              description: "A brief analysis of cleaning timing and efficiency."
            },
            recommendation: {
              type: Type.STRING,
              description: "Actionable advice for the facility manager for the next shift."
            }
          },
          required: ["complianceScore", "keyIssues", "efficiencyInsight", "recommendation"]
        }
      }
    });
    
    if (response.text) {
      return JSON.parse(response.text) as ShiftReport;
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};