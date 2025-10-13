import React from 'react';
import ButtonLogInVia from '../components/buttons/ButtonLogInVia';
import ButtonSignUpClassic from '../components/buttons/ButtonSignUpClassic';
import ContainerFlexColumn from '../components/containers/ContainerFlexColumn';
import SubContainerFlexRow from '../components/containers/SubContainerFlexRow';

export default function SignUpScreen() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  return (
    <ContainerFlexColumn>
      <SubContainerFlexRow>
        <ButtonSignUpClassic title="Sign up with an e-mail" />
      </SubContainerFlexRow>
      <SubContainerFlexRow>
        <ButtonLogInVia provider="spotify" />
        <ButtonLogInVia provider="soundcloud" />
        <ButtonLogInVia provider="steam" />
      </SubContainerFlexRow>
      <SubContainerFlexRow>
        <ButtonLogInVia provider="google" />
        <ButtonLogInVia provider="github" />
      </SubContainerFlexRow>
    </ContainerFlexColumn>
  );
}