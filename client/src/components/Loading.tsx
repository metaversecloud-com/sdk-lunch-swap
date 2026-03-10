export const Loading = ({ isSpinner = false }: { isSpinner: boolean }) => {
  if (isSpinner) {
    return (
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    );
  }

  return (
    <div className="container my-6" role="status" aria-label="Loading">
      <img
        alt=""
        aria-hidden="true"
        src="https://sdk-style.s3.amazonaws.com/icons/loading.svg"
        style={{ margin: "auto", width: 50, height: 50 }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
};
