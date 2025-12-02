import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import React from 'react';
import PlaylistDetailsScreen from '../../components/playlists/[id]';
import "../../global.css"

export default function Index() {
  return (
      <PlaylistDetailsScreen />
  );
}
