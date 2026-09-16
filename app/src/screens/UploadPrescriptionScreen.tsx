import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Txt, Row, Spacer, TopBar, Card } from '../components/ui';
import { Icon } from '../components/Icon';
import { recognizeFile, isOcrAvailable } from '../services/ocr';
import { parsePrescription, mergeAiSuggestions } from '../engines/prescriptionParser';
import { SAMPLE_PRESCRIPTION_TEXT } from '../data/samplePrescription';
import { useStore } from '../state/AppStore';
import { extractJsonArray, loadApiKey, structureOcrText } from '../services/ai';

export function UploadPrescriptionScreen() {
  const { c, radius } = useTheme();
  const nav = useNavigation<any>();
  const { settings } = useStore();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');

  /**
   * The on-device parser always runs and always wins. The cloud pass is a
   * second opinion on the lines it wasn't sure about, and only when the user
   * has switched it on.
   */
  const handleText = async (text: string, sourceLabel: string) => {
    let parsed = parsePrescription(text);

    const unsure = parsed.some((p) => p.generic === null);
    if (settings.aiEnabled && settings.aiOcrAssist && (unsure || parsed.length === 0)) {
      const apiKey = await loadApiKey();
      if (apiKey) {
        setStage('Asking for a second opinion…');
        const res = await structureOcrText(text, {
          provider: settings.aiProvider,
          apiKey,
          model: settings.aiModel,
        });
        const items = res.text ? extractJsonArray(res.text) : null;
        if (items) parsed = mergeAiSuggestions(parsed, items);
      }
    }

    if (parsed.length === 0) {
      Alert.alert(
        "Couldn't read that",
        "We couldn't find any medicines in that file. The text may be too faint or handwritten — you can add them by hand instead.",
        [
          { text: 'Try again', style: 'cancel' },
          { text: 'Add by hand', onPress: () => nav.replace('AddMedicine') },
        ],
      );
      return;
    }
    nav.replace('ReviewExtracted', { parsed, sourceLabel });
  };

  const runOcr = async (uri: string, label: string) => {
    setBusy(true);
    setStage('Reading the prescription…');
    try {
      const result = await recognizeFile(uri);
      if (!result.text) {
        Alert.alert(
          "Couldn't read that",
          result.error ?? 'No readable text was found. You can add the medicines by hand instead.',
          [
            { text: 'Try again', style: 'cancel' },
            { text: 'Add by hand', onPress: () => nav.replace('AddMedicine') },
          ],
        );
        return;
      }
      await handleText(result.text, label);
    } catch {
      Alert.alert('Something went wrong', 'We could not read that file. Please try another one.');
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera permission needed', 'MediBloom needs the camera to photograph a prescription.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: false });
      if (res.canceled || !res.assets?.[0]) return;
      await runOcr(res.assets[0].uri, 'Photo');
    } catch {
      Alert.alert('Camera unavailable', 'Could not open the camera on this device.');
    }
  };

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      await runOcr(asset.uri, asset.name ?? 'File');
    } catch {
      Alert.alert('Could not open that', 'Please try a different file.');
    }
  };

  /** The reliable demo path — real parsing, known-good input. */
  const useSample = async () => {
    setBusy(true);
    setStage('Reading the prescription…');
    try {
      await handleText(SAMPLE_PRESCRIPTION_TEXT, 'sample_prescription.pdf');
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  if (busy) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <ActivityIndicator size="large" color={c.rose} />
        <Txt variant="small" color={c.inkSoft}>{stage}</Txt>
        <Txt variant="tiny" color={c.inkFaint}>
          {stage.startsWith('Asking')
            ? 'Cloud assist is on — you confirm everything before it saves'
            : 'Running on your phone — nothing is uploaded'}
        </Txt>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TopBar title="Add from a prescription" onBack={() => nav.goBack()} />
        <Txt variant="tiny" color={c.inkFaint}>
          Reads it on your phone — nothing is uploaded anywhere.
        </Txt>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 20, flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take a photo of a prescription"
          onPress={takePhoto}
          style={{
            backgroundColor: c.ink, borderRadius: radius.xl,
            paddingVertical: 26, paddingHorizontal: 20, alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 62, height: 62, borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}
          >
            <Icon name="camera" size={29} color={c.roseTint} />
          </View>
          <Txt variant="title" weight="black" color={c.white}>Take a photo</Txt>
          <Txt variant="tiny" color={c.violetTint} style={{ marginTop: 3 }}>
            Line the prescription up in good light
          </Txt>
        </Pressable>

        <Row gap={10} style={{ marginVertical: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: c.borderStrong }} />
          <Txt variant="micro" color={c.inkGhost} weight="bold">or</Txt>
          <View style={{ flex: 1, height: 1, backgroundColor: c.borderStrong }} />
        </Row>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose a PDF or photo from your files"
          onPress={pickFile}
          style={{
            borderWidth: 2, borderStyle: 'dashed', borderColor: c.violetTint,
            borderRadius: radius.lg + 2, padding: 20, alignItems: 'center',
          }}
        >
          <Icon name="upload" size={22} color={c.violet} />
          <Spacer h={8} />
          <Txt variant="body" weight="black">Choose a PDF or photo</Txt>
          <Txt variant="tiny" color={c.inkFaint} style={{ marginTop: 2 }}>From your files or gallery</Txt>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try our sample prescription"
          onPress={() => void useSample()}
          style={{ marginTop: 18, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}
        >
          <Row gap={7}>
            <Icon name="file" size={13} color={c.violet} />
            <Txt variant="small" weight="bold" color={c.violet} style={{ textDecorationLine: 'underline' }}>
              Try our sample prescription
            </Txt>
          </Row>
        </Pressable>

        <Spacer h={14} />
        <View style={{ backgroundColor: c.goldSoft, borderRadius: radius.md, padding: 13 }}>
          <Row gap={10} align="flex-start">
            <Icon name="bulb" size={15} color={c.gold} />
            <Txt variant="tiny" color={c.ink} style={{ flex: 1, lineHeight: 17 }}>
              Works best on typed or printed prescriptions. For handwriting, we'll show exactly
              what we read and ask you to confirm before saving anything.
            </Txt>
          </Row>
        </View>

        {!isOcrAvailable() ? (
          <View style={{ marginTop: 12, backgroundColor: c.coralSoft, borderRadius: radius.md, padding: 12 }}>
            <Txt variant="tiny" color={c.coralDeep} style={{ lineHeight: 17 }}>
              Text recognition isn't available in this build, so photos and PDFs can't be read
              yet. The sample prescription still works, and you can always add medicines by hand.
            </Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}
