import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ExploreHome from '../ExploreHome';
import { ProfileProvider } from '../profile/ProfileProvider';
import { useAppTheme } from '../theme/AppTheme';
import { Hero, InlineError, MapBackdrop, PrimaryButton } from './AuthComponents';
import { styles } from './authStyles';
import type { AuthTab, OnAuthenticated } from './authTypes';
import CompletePhoneDialog from './CompletePhoneDialog';
import LoginPanel from './LoginPanel';
import RegisterPanel from './RegisterPanel';
import { useAuthScreenViewModel } from './useAuthScreenViewModel';
function AuthSheet({
  activeTab,
  onChangeTab,
  onAuthenticated,
}: {
  activeTab: AuthTab;
  onChangeTab: (tab: AuthTab) => void;
  onAuthenticated: OnAuthenticated;
}) {
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <View style={styles.segmentedControl}>
        <View
          style={[
            styles.segmentIndicator,
            activeTab === 'register' && styles.segmentIndicatorRegister,
          ]}
        />
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'login' }}
          onPress={() => onChangeTab('login')}
          style={styles.segmentButton}
        >
          <Text style={[styles.segmentText, activeTab === 'login' && styles.segmentTextActive]}>
            Đăng nhập
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'register' }}
          onPress={() => onChangeTab('register')}
          style={styles.segmentButton}
        >
          <Text style={[styles.segmentText, activeTab === 'register' && styles.segmentTextActive]}>
            Đăng ký
          </Text>
        </Pressable>
      </View>

      {activeTab === 'login' ? (
        <LoginPanel onRegister={() => onChangeTab('register')} onAuthenticated={onAuthenticated} />
      ) : (
        <RegisterPanel onLogin={() => onChangeTab('login')} onAuthenticated={onAuthenticated} />
      )}
    </View>
  );
}
export default function AuthScreen() {
  const {
    activeTab,
    setActiveTab,
    session,
    request,
    restoring,
    restoreError,
    sessionError,
    restoreSession,
    authenticate,
    completePhone,
    logout,
    changePassword,
    discardSavedSession,
    realtimeCredentials,
  } = useAuthScreenViewModel(Alert.alert);
  const theme = useAppTheme();
  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.screen, session && { backgroundColor: theme.colors.pale }]}
        edges={['top', 'bottom']}
      >
        <StatusBar style={session && theme.mode === 'dark' ? 'light' : 'dark'} />
        {restoring || restoreError ? (
          <View style={[styles.panelContent, { flex: 1, justifyContent: 'center' }]}>
            {restoring ? (
              <>
                <ActivityIndicator />
                <Text style={styles.promptText}>Đang khôi phục phiên đăng nhập…</Text>
              </>
            ) : (
              <>
                <InlineError message={restoreError} />
                <PrimaryButton
                  label="Thử lại"
                  loading={false}
                  onPress={() => {
                    void restoreSession();
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void discardSavedSession();
                  }}
                >
                  <Text style={styles.link}>Đăng nhập bằng tài khoản khác</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : session && !session.user.phone?.trim() ? (
          <>
            <MapBackdrop />
            <CompletePhoneDialog
              onComplete={completePhone}
              onLogout={logout}
              sessionError={sessionError}
            />
          </>
        ) : session ? (
          <>
            <InlineError message={sessionError} />
            <ProfileProvider key={session.user.id} user={session.user} request={request}>
              <ExploreHome
                request={request}
                realtimeCredentials={realtimeCredentials}
                onLogout={() => {
                  void logout();
                }}
                onChangePassword={changePassword}
              />
            </ProfileProvider>
          </>
        ) : (
          <>
            <MapBackdrop />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.flex}
            >
              <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Hero activeTab={activeTab} />
                <InlineError message={sessionError} />
                <AuthSheet
                  activeTab={activeTab}
                  onChangeTab={setActiveTab}
                  onAuthenticated={authenticate}
                />
              </ScrollView>
            </KeyboardAvoidingView>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
