import styles from '../styles/loadingIcon.module.css';

const LoadingIcon = () => (
    <div className={styles.loadingContainer} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <div className={styles.loader}></div>
    </div>
  );

export default LoadingIcon;