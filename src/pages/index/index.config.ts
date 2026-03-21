export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '集合竞价主力监控',
      enablePullDownRefresh: true,
      backgroundTextStyle: 'dark',
    })
  : {
      navigationBarTitleText: '集合竞价主力监控',
      enablePullDownRefresh: true,
      backgroundTextStyle: 'dark',
    }
