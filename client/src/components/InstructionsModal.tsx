export const InstructionsModal = ({ handleToggleShowInstructions }: { handleToggleShowInstructions: () => void }) => {
  return (
    <div className="modal-container" onClick={handleToggleShowInstructions}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="grid gap-2 text-left">
          <h3>Uh-oh! Your lunch got mixed up!</h3>
          <p>
            You need to build your <strong>Perfect Lunch</strong>, but you don't have the right foods yet.
          </p>
          <p>Everyone is looking for different foods.</p>
          <p>Explore to find what you need, and help each other by dropping items others can use.</p>
          <p>You can:</p>
          <ul className="p2 list-disc pl-5 grid gap-1">
            <li>Keep items</li>
            <li>Drop items for others</li>
            <li>Pick up items you need</li>
          </ul>
          <p>Work together to complete your Perfect Lunch!</p>
        </div>
        <button className="btn mt-2" onClick={handleToggleShowInstructions} aria-label="Close instructions">
          Got it!
        </button>
      </div>
    </div>
  );
};

export default InstructionsModal;
