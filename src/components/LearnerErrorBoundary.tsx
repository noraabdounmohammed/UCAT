import React from 'react';

interface LearnerErrorBoundaryProps {
  children: React.ReactNode;
}

interface LearnerErrorBoundaryState {
  hasError: boolean;
}

export class LearnerErrorBoundary extends React.Component<LearnerErrorBoundaryProps, LearnerErrorBoundaryState> {
  state: LearnerErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): LearnerErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('StudyEdit learner surface crashed:', error, info);
  }

  private retry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  private goHome = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-[#F4ECDF] px-5 py-10 text-[#2A1E16]">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-[520px] flex-col justify-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A7560]">StudyEdit</div>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.03em] text-[#1F140C]">
            That page didn’t load properly.
          </h1>
          <p className="mt-3 text-[16px] font-medium leading-7 text-[#6F5D4C]">
            Anything already saved will still be there. Try the page again, or go back home and start from there.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={this.retry}
              className="min-h-[50px] rounded-full bg-[#1F140C] px-6 text-[15px] font-bold text-[#FAF5EC]"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.goHome}
              className="min-h-[50px] rounded-full border border-[#DCCDB8] bg-[#FFFDF8] px-6 text-[15px] font-bold text-[#2A1E16]"
            >
              Back home
            </button>
          </div>
        </div>
      </main>
    );
  }
}
