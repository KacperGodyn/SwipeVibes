import React from 'react';
import { View, Pressable } from 'react-native';
import UndoIcon from '../../assets/HomeCard/undo.svg';
import DislikeIcon from '../../assets/HomeCard/dislike.svg';
import StarIcon from '../../assets/HomeCard/star.svg';
import LikeIcon from '../../assets/HomeCard/like.svg';

type Props = {
  onUndo?: () => void;
  onDislike?: () => void;
  onSuper?: () => void;
  onLike?: () => void;
  undoDisabled?: boolean;
};

export default function CardNavigationContainer({
  onUndo, onDislike, onSuper, onLike, undoDisabled,
}: Props) {
  return (
    <View className="mx-auto w-full max-w-[380px] flex-row items-center justify-between rounded-[32px] border border-[#222222] bg-[#0F0F0F] px-8 py-4 shadow-xl shadow-black self-center gap-5">
      <Pressable
        className="items-center justify-center rounded-full bg-[#1A1A1A] border border-[#333333] p-3 shadow-lg shadow-black/50 active:scale-95 active:border-[#4CAF50]/50"
        style={{ opacity: undoDisabled ? 0.3 : 1 }}
        onPress={() => !undoDisabled && onUndo?.()}
      >
        <UndoIcon width={28} height={28} color="#f0c954ff"/>
      </Pressable>

      <Pressable 
        className="items-center justify-center rounded-full bg-[#1A1A1A] border border-[#333333] p-3 shadow-lg shadow-black/50 active:scale-95 active:border-[#F05454]/50" 
        onPress={onDislike}
      >
        <DislikeIcon width={32} height={32} color="#F05454" />
      </Pressable>

      <Pressable 
        className="items-center justify-center rounded-full bg-[#1A1A1A] border border-[#333333] p-3 shadow-lg shadow-black/50 active:scale-95 active:border-[#4CAF50]/50" 
        onPress={onSuper}
      >
        <StarIcon width={28} height={28} color="#4c6bafff" />
      </Pressable>

      <Pressable 
        className="items-center justify-center rounded-full bg-[#1A1A1A] border border-[#333333] p-3 shadow-lg shadow-black/50 active:scale-95 active:border-[#4CAF50]/50" 
        onPress={onLike}
      >
        <LikeIcon width={32} height={32} color="#4CAF50" />
      </Pressable>
    </View>
  );
}