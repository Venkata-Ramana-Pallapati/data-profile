import React from "react";

interface BackButtonProps {
  onBack: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({ onBack }) => {
  return (
    <button
      onClick={onBack}
      className="p-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
    >
      Back
    </button>
  );
};

export default BackButton;
