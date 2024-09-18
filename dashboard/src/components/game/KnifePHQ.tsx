import { useEffect } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

export const KnifePHQ: React.FC<{ generatedImageUrl: string | null }> = ({ generatedImageUrl }) => {
  const currentUrl = window.location.origin;
  const unityContext = useUnityContext({
    loaderUrl: `${currentUrl}/game/knifePHQ/Build/knifePHQ.loader.js`,
    dataUrl: `${currentUrl}/game/knifePHQ/Build/knifePHQ.data`,
    frameworkUrl: `${currentUrl}/game/knifePHQ/Build/knifePHQ.framework.js`,
    codeUrl: `${currentUrl}/game/knifePHQ/Build/knifePHQ.wasm`,
  });

  const { unityProvider, sendMessage } = unityContext;

  useEffect(() => {
    if (generatedImageUrl) {
      console.log("Sending message to Unity with URL:", generatedImageUrl);
      sendMessage('AIConnector', 'ChangeBackground', generatedImageUrl);
    }
  }, [generatedImageUrl, sendMessage]);

  return <Unity unityProvider={unityProvider} style={{ width: "100%", height: "100%" }} />;
}

export default KnifePHQ;
