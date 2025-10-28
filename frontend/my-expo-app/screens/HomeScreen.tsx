import React from 'react';
import { View, Text } from 'react-native';
import ContainerFlexColumn from 'components/containers/ContainerFlexColumn';
import SubContainerFlexRow from 'components/containers/SubContainerFlexRow';
import NavigationContainer from 'components/containers/NavigationContainer';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 8 }}>
        <ContainerFlexColumn
          style={{ width: '85%', alignSelf: 'center', height: '85%' }}
          colors={gradient}>
          <SubContainerFlexRow style={{ width: '85%', alignSelf: 'center', height: '82%' }}>
            <View className="bg-white">
              <Text>sample</Text>
            </View>
          </SubContainerFlexRow>
          <SubContainerFlexRow>
            <NavigationContainer /> 
          </SubContainerFlexRow>
        </ContainerFlexColumn>
      </View>

      <View style={{ flex: 1.5 }}>
        <ContainerFlexColumn
          style={{ width: '85%', alignSelf: 'center', height: '60%', marginBottom: 60 }}>
          <SubContainerFlexRow>
            <Text>navi</Text>
          </SubContainerFlexRow>
        </ContainerFlexColumn>
      </View>
    </View>
  );
}

const gradient = ['#00F539', '#22CA49', '#35A04E', '#3B7548', '#324B38', '#2B332C'] as const;
