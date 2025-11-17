import GeneralNavigationContainer from 'components/containers/GeneralNavigationContainer';
import ContainerFlexColumn from 'components/containers/ContainerFlexColumn';
import SubContainerFlexRow from 'components/containers/SubContainerFlexRow';
import ProfileCard from 'components/ProfileCard';
import { View } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 8 }}>
        <ContainerFlexColumn style={{ width: '85%', alignSelf: 'center', height: '85%' }}>
          <SubContainerFlexRow style={{ width: '85%', alignSelf: 'center', height: '82%' }}>
            <ProfileCard />
          </SubContainerFlexRow>
        </ContainerFlexColumn>
      </View>
      <View style={{ flex: 1.5 }}>
        <ContainerFlexColumn
          style={{
            width: '85%',
            alignSelf: 'center',
            height: '60%',
            marginBottom: 60,
          }}>
          <SubContainerFlexRow>
            <GeneralNavigationContainer />
          </SubContainerFlexRow>
        </ContainerFlexColumn>
      </View>
    </View>
  );
}
