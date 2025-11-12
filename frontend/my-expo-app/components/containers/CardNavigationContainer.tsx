import React from 'react';
import { View, Pressable } from 'react-native';
import UndoIcon from '../../assets/HomeCard/undo.svg';
import DislikeIcon from '../../assets/HomeCard/dislike.svg';
import StarIcon from '../../assets/HomeCard/star.svg';
import LikeIcon from '../../assets/HomeCard/like.svg';

export default function CardNavigationContainer() {
  return (
    <View className="rounded-3xl bg-white py-2 px-2 shadow-md flex-row items-center justify-around gap-5 border border-white/20 bg-white/30 backdrop-blur-xl">
      <Pressable className='active:bg-white/40 rounded-full p-2'>
        <UndoIcon width={40} height={40} />
      </Pressable>
      <Pressable className='active:bg-white/40 rounded-full p-2'>
        <DislikeIcon width={40} height={40} />
      </Pressable>
      <Pressable className='active:bg-white/40 rounded-full p-2'>
        <StarIcon width={40} height={40} />
      </Pressable>
      <Pressable className='active:bg-white/40 rounded-full p-2'>
        <LikeIcon width={40} height={40} />
      </Pressable>
    </View>
  );
}
