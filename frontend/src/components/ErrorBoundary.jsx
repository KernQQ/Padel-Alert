import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      message: ""
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Nieznany błąd aplikacji."
    };
  }

  componentDidCatch(error, info) {
    console.error("PadelAlert UI error:", error, info);
  }

  reload = () => {
    window.location.reload();
  };

  resetLocalUi = () => {
    localStorage.removeItem("padelalert-theme");
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="fatal-error-screen">
        <section>
          <div className="fatal-error-logo">PA</div>
          <span className="section-kicker">PADELALERT</span>
          <h1>Coś poszło nie tak.</h1>
          <p>
            Dane nie zostały usunięte. Spróbuj przeładować aplikację.
            Jeśli problem wróci, pokaż nam komunikat poniżej.
          </p>

          <code>{this.state.message}</code>

          <div>
            <button type="button" onClick={this.reload}>
              Odśwież aplikację
            </button>

            <button
              type="button"
              className="secondary"
              onClick={this.resetLocalUi}
            >
              Zresetuj tylko wygląd
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
