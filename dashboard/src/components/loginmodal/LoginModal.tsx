// components/LoginModal.tsx
import { useWeb3Auth } from 'contexts/Web3Provider';

const LoginModal = () => {
  const { login } = useWeb3Auth();

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Welcome to GameHub</h2>
      <p className="mb-4">Please login to continue</p>
      <button
        onClick={login}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Login with Web3Auth
      </button>
    </div>
  );
};

export default LoginModal;