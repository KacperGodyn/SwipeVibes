import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '../../services/theme/ThemeContext';
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
  onUndo,
  onDislike,
  onSuper,
  onLike,
  undoDisabled,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      className="mx-auto w-full max-w-[340px] flex-row items-center justify-between gap-3 self-center rounded-[32px] border px-6 py-3 shadow-xl"
      style={{
        backgroundColor: colors.input,
        borderColor: colors.inputBorder,
        shadowColor: colors.text, // Subtle shadow using text color (black/white)
      }}>
      <Pressable
        className="items-center justify-center rounded-full border p-3 shadow-lg active:scale-95"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.inputBorder,
          shadowColor: '#000', // Buttons can keep black shadow for pop
          opacity: undoDisabled ? 0.3 : 1,
        }}
        onPress={() => !undoDisabled && onUndo?.()}>
        <UndoIcon width={28} height={28} color="#f0c954ff" />
      </Pressable>

      <Pressable
        className="items-center justify-center rounded-full border p-3 shadow-lg active:scale-95"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.inputBorder,
          shadowColor: '#000',
        }}
        onPress={onDislike}>
        <DislikeIcon width={32} height={32} color="#F05454" />
      </Pressable>

      <Pressable
        className="items-center justify-center rounded-full border p-3 shadow-lg active:scale-95"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.inputBorder,
          shadowColor: '#000',
        }}
        onPress={onSuper}>
        <StarIcon width={28} height={28} color="#4c6bafff" />
      </Pressable>

      <Pressable
        className="items-center justify-center rounded-full border p-3 shadow-lg active:scale-95"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.inputBorder,
          shadowColor: '#000',
        }}
        onPress={onLike}>
        <LikeIcon width={32} height={32} color="#4CAF50" />
      </Pressable>
    </View>
  );
}
