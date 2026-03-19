export const AdminIconButton = ({
  setShowSettings,
  showSettings,
}: {
  setShowSettings: (value: boolean) => void;
  showSettings: boolean;
}) => {
  return (
    <button
      className="mb-4"
      onClick={() => setShowSettings(showSettings)}
      aria-label={showSettings ? "Back to game" : "Open admin settings"}
    >
      <img
        src={`https://sdk-style.s3.amazonaws.com/icons/${showSettings ? "arrow" : "cog"}.svg`}
        alt=""
        aria-hidden="true"
      />
    </button>
  );
};

export default AdminIconButton;
