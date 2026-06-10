import React, { useState } from "react";

const PROMPT_OPTIONS = [
  { emoji: "🐟", text: "I feel like eating fish this week" },
  { emoji: "🔥", text: "I want something spicy" },
  { emoji: "🌿", text: "Light and healthy meals please" },
  { emoji: "💰", text: "I'm on a tight budget" },
  { emoji: "🥩", text: "High protein meals" },
  { emoji: "✨", text: "Surprise me" },
];

const AIPromptSelector = ({ selectedPrompt, onSelect }) => {
  const [customText, setCustomText] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);

  const handlePresetSelect = (option) => {
    // Toggle selection
    if (selectedPreset === option.text) {
      setSelectedPreset(null);
      setCustomText("");
      onSelect("");
    } else {
      setSelectedPreset(option.text);
      setCustomText("");
      onSelect(option.text);
    }
  };

  const handleCustomTextChange = (e) => {
    const text = e.target.value;
    setCustomText(text);
    setSelectedPreset(null);
    onSelect(text);
  };

  return (
    <div className="w-full">
      {/* Preset Prompt Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {PROMPT_OPTIONS.map((option) => (
          <button
            key={option.text}
            onClick={() => handlePresetSelect(option)}
            className={`p-3 rounded-xl border-2 transition-all text-sm font-medium flex items-center gap-2 justify-center ${
              selectedPreset === option.text
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-800 border-gray-200 hover:border-primary"
            }`}
          >
            <span className="text-lg">{option.emoji}</span>
            <span className="text-xs">{option.text.split(" ").slice(0, 2).join(" ")}</span>
          </button>
        ))}
      </div>

      {/* Free-Text Input - Only visible if no preset selected */}
      {!selectedPreset && (
        <div className="w-full">
          <textarea
            value={customText}
            onChange={handleCustomTextChange}
            placeholder="Or describe what you feel like eating..."
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none resize-none text-sm"
            rows="3"
          />
          <p className="text-xs text-gray-500 mt-1">
            {customText.length > 0 && `${customText.length} characters`}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIPromptSelector;
