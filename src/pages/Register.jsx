
import { Link } from 'react-router-dom';

function Register() {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>GRAIN LEDGER</h1>
        <p>RICE MILL MANAGEMENT</p>

        <h2>Create Your Account</h2>
        <p>Select your account type to continue.</p>

        <div className="register-options">
          <Link to="/register/miller" className="register-option">
            <h3>Miller</h3>
            <p>Register your rice mill business.</p>
            <span>Continue →</span>
          </Link>

          <Link
            to="/register/commissiondar"
            className="register-option"
          >
            <h3>Commissiondar</h3>
            <p>Create your independent account.</p>
            <span>Continue →</span>
          </Link>
        </div>

        <p>
          Already have an account?{' '}
          <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
