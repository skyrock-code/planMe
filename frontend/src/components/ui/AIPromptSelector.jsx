import React, { useState } from "react";

// Replace emojis with Material Icons
const PROMPT_OPTIONS = [
  { text: "I feel like eating fish this week", icon: "restaurant" },
  { text: "I want something spicy", icon: "local_fire_department" },
  { text: "Light and healthy meals please", icon: "spa" },
  { text: "I'm on a tight budget", icon: "payments" },
  { text: "High protein meals", icon: "fitness_center" },
  { text: "Surprise me", icon: "auto_awesome" },
];

const AIPromptSelector = ({ selectedPrompt, onSelect }) => {
  const [customText, setCustomText] = useState("");

  const handlePresetSelect = (optionText) => {
    // Toggle selection
    if (selectedPrompt === optionText) {
      onSelect("");
    } else {
      setCustomText("");
      onSelect(optionText);
    }
  };

  const handleCustomTextChange = (e) => {
    const text = e.target.value;
    setCustomText(text);
    onSelect(text);
  };

  return (
    <div className="w-full">
      {/* Preset Prompt Buttons - Wrap to next line */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PROMPT_OPTIONS.map((option) => (
          <button
            key={option.text}
            onClick={() => handlePresetSelect(option.text)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              selectedPrompt === option.text
                ? "bg-primary text-white shadow-md"
                : "bg-gray-100 dark:bg-white/10 text-[#618968] hover:bg-primary/20"
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {option.icon}
            </span>
            {option.text}
          </button>
        ))}
      </div>

      {/* Free-Text Input */}
      <div className="w-full">
        <textarea
          value={customText}
          onChange={handleCustomTextChange}
          placeholder="Or describe what you feel like eating..."
          className="w-full p-3 border border-[#dbe6dd] dark:border-white/10 rounded-xl text-sm text-[#111812] dark:text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
        {customText.length > 0 && (
          <p className="text-xs text-[#618968] mt-1">
            {customText.length} characters
          </p>
        )}
      </div>
    </div>
  );
};

export default AIPromptSelector;