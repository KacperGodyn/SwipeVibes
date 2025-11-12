import React from 'react';
import { View, Text } from 'react-native';
import ContainerFlexColumn from 'components/containers/ContainerFlexColumn';
import SubContainerFlexRow from 'components/containers/SubContainerFlexRow';
import CardNavigationContainer from 'components/containers/CardNavigationContainer';
import GeneralNavigationContainer from 'components/containers/GeneralNavigationContainer';
import MainCardDisplayedContent from 'components/MainCardDisplayedContent';


export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 8 }}>
        <ContainerFlexColumn
          style={{ width: '85%', alignSelf: 'center', height: '85%' }}
          colors={cardGradient}>
          <SubContainerFlexRow style={{ width: '85%', alignSelf: 'center', height: '82%' }}>
            <View>
              <MainCardDisplayedContent />
            </View>
          </SubContainerFlexRow>
          <SubContainerFlexRow>
            <CardNavigationContainer />
          </SubContainerFlexRow>
        </ContainerFlexColumn>
      </View>

      <View style={{ flex: 1.5 }}>
        <ContainerFlexColumn
          style={{ width: '85%', alignSelf: 'center', height: '60%', marginBottom: 60 }}>
          <SubContainerFlexRow>
            <GeneralNavigationContainer />
          </SubContainerFlexRow>
        </ContainerFlexColumn>
      </View>
    </View>
  );
};

const cardGradient = ['#00F539', '#22CA49', '#35A04E', '#3B7548', '#324B38', '#2B332C'] as const;
