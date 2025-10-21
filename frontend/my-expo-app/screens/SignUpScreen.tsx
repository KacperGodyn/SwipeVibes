import React from "react";
import { router } from "expo-router";
import ButtonLogInVia from "../components/buttons/ButtonLogInVia";
import ButtonSignUpClassic from "../components/buttons/ButtonSignUpClassic";
import ContainerFlexColumn from "../components/containers/ContainerFlexColumn";
import SubContainerFlexRow from "../components/containers/SubContainerFlexRow";
import { useGoogleLogin } from "../services/auth/gRPC/user/services/useGoogleLogin";
import { loginWithGoogle } from "../services/auth/api";

import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";

export default function SignUpScreen() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const google = useGoogleLogin({
    onSuccess: async (googleIdToken) => {
      const cred = GoogleAuthProvider.credential(googleIdToken);
      const userCred = await signInWithCredential(auth, cred);

      const firebaseIdToken = await userCred.user.getIdToken();

      const res = await loginWithGoogle(firebaseIdToken); // sets access token internally
      console.log("Logged in as:", res.username);
      router.replace('/home');
    },
    onError: (err) => {
      console.error(err);
      alert("Google sign-in failed");
    },
  });

  const doSpotify = React.useCallback(() => alert("Spotify login TBD"), []);
  const doSoundCloud = React.useCallback(() => alert("SoundCloud login TBD"), []);
  const doSteam = React.useCallback(() => alert("Steam login TBD"), []);
  const doGitHub = React.useCallback(() => alert("GitHub login TBD"), []);

  return (
    <ContainerFlexColumn>
      <SubContainerFlexRow>
        <ButtonSignUpClassic title="Sign up with an e-mail" />
      </SubContainerFlexRow>

      <SubContainerFlexRow>
        <ButtonLogInVia provider="spotify" onPress={doSpotify} />
        <ButtonLogInVia provider="soundcloud" onPress={doSoundCloud} />
        <ButtonLogInVia provider="steam" onPress={doSteam} />
      </SubContainerFlexRow>

      <SubContainerFlexRow>
        <ButtonLogInVia
          provider="google"
          onPress={() => { void google.promptAsync(); }}
          disabled={!google.ready}
          loading={google.loading}
        />
        <ButtonLogInVia provider="github" onPress={doGitHub} />
      </SubContainerFlexRow>
    </ContainerFlexColumn>
  );
}
